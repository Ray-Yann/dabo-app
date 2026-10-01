-- DABO Scan V3 — persistance atomique des tickets confirmés.
-- Aucune transaction Finance n'est créée ici : Finance reste une confirmation séparée.

begin;

alter table public.shopping_sessions
  add column if not exists purchase_date date;

alter table public.shopping_items
  add column if not exists receipt_quantity numeric,
  add column if not exists receipt_unit text,
  add column if not exists line_total numeric(12,2);

alter table public.shopping_receipts
  add column if not exists source text,
  add column if not exists adjustments jsonb not null default '[]'::jsonb,
  add column if not exists client_request_id uuid;

create unique index if not exists shopping_receipts_household_client_request_uidx
  on public.shopping_receipts(household_id, client_request_id)
  where client_request_id is not null;

create or replace function public.dabo_import_confirmed_receipt(
  p_household_id uuid,
  p_shopper_member_id uuid,
  p_merchant text,
  p_purchase_date date,
  p_total_amount numeric,
  p_currency text,
  p_source text,
  p_raw_text text,
  p_adjustments jsonb,
  p_items jsonb,
  p_client_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_member_id uuid;
  v_receipt_id uuid;
  v_session_id uuid;
  v_now timestamptz := now();
  v_item jsonb;
  v_name text;
  v_quantity numeric;
  v_unit text;
  v_unit_price numeric;
  v_line_total numeric;
  v_item_count integer;
  v_items_total numeric := 0;
  v_adjustments_total numeric := 0;
  v_adjustment jsonb;
  v_adjustment_amount numeric;
begin
  select m.id
  into v_actor_member_id
  from public.members m
  where m.household_id = p_household_id
    and m.user_id = auth.uid()
    and m.left_at is null
  limit 1;

  if v_actor_member_id is null then
    raise exception 'Active household member required';
  end if;

  if p_client_request_id is null then
    raise exception 'Client request id required';
  end if;

  -- Sérialise les tentatives portant le même identifiant client dans
  -- un même foyer. La seconde requête attend la première puis relit
  -- le ticket déjà créé au lieu de provoquer un doublon.
  perform pg_advisory_xact_lock(
    hashtextextended(
      p_household_id::text || ':' || p_client_request_id::text,
      0
    )
  );

  select r.id
  into v_receipt_id
  from public.shopping_receipts r
  where r.household_id = p_household_id
    and r.client_request_id = p_client_request_id
  limit 1;

  if v_receipt_id is not null then
    return v_receipt_id;
  end if;

  if not exists (
    select 1
    from public.members m
    where m.id = p_shopper_member_id
      and m.household_id = p_household_id
      and m.left_at is null
  ) then
    raise exception 'Shopper must belong to household';
  end if;

  if p_merchant is null or btrim(p_merchant) = '' then
    raise exception 'Confirmed receipt merchant required';
  end if;

  if p_purchase_date is null then
    raise exception 'Confirmed receipt purchase date required';
  end if;

  if p_source is null or btrim(p_source) not in ('photo', 'digital_document') then
    raise exception 'Confirmed receipt source invalid';
  end if;

  if p_total_amount is null or p_total_amount < 0 then
    raise exception 'Confirmed receipt total required';
  end if;

  if p_currency is null or btrim(p_currency) = '' then
    raise exception 'Confirmed receipt currency required';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Confirmed receipt items required';
  end if;

  v_item_count := jsonb_array_length(p_items);

  -- Validation complète avant toute insertion.
  for v_item in
    select value from jsonb_array_elements(p_items)
  loop
    v_name := btrim(coalesce(v_item->>'name', ''));
    v_quantity := case
      when nullif(v_item->>'quantity', '') is null then null
      else (v_item->>'quantity')::numeric
    end;
    v_unit := nullif(btrim(coalesce(v_item->>'unit', '')), '');
    v_unit_price := case
      when nullif(v_item->>'unitPrice', '') is null then null
      else (v_item->>'unitPrice')::numeric
    end;
    v_line_total := case
      when nullif(v_item->>'lineTotal', '') is null then null
      else (v_item->>'lineTotal')::numeric
    end;

    if v_name = '' then
      raise exception 'Confirmed receipt item name required';
    end if;

    if v_line_total is null or v_line_total < 0 then
      raise exception 'Confirmed receipt line total required';
    end if;

    if (v_quantity is null) <> (v_unit_price is null) then
      raise exception 'Confirmed receipt quantity and unit price must be provided together';
    end if;

    if v_quantity is not null and v_quantity <= 0 then
      raise exception 'Confirmed receipt quantity must be greater than zero';
    end if;

    if v_unit_price is not null and v_unit_price < 0 then
      raise exception 'Confirmed receipt unit price cannot be negative';
    end if;

    if v_quantity is not null
       and abs(round(v_quantity * v_unit_price, 2) - round(v_line_total, 2)) > 0.01 then
      raise exception 'Confirmed receipt item math is inconsistent';
    end if;

    v_items_total := v_items_total + v_line_total;
  end loop;

  if p_adjustments is not null and jsonb_typeof(p_adjustments) <> 'array' then
    raise exception 'Confirmed receipt adjustments must be an array';
  end if;

  for v_adjustment in
    select value
    from jsonb_array_elements(coalesce(p_adjustments, '[]'::jsonb))
  loop
    begin
      v_adjustment_amount := (v_adjustment->>'amount')::numeric;
    exception
      when invalid_text_representation then
        raise exception 'Confirmed receipt adjustment amount must be numeric';
    end;

    if v_adjustment_amount is null then
      raise exception 'Confirmed receipt adjustment amount required';
    end if;

    v_adjustments_total := v_adjustments_total + v_adjustment_amount;
  end loop;

  if abs(
    round(v_items_total + v_adjustments_total, 2)
    - round(p_total_amount, 2)
  ) > 0.01 then
    raise exception 'Confirmed receipt total is inconsistent';
  end if;

  insert into public.shopping_receipts(
    household_id,
    created_by_member_id,
    shopper_member_id,
    merchant,
    purchase_date,
    total_amount,
    currency,
    raw_text,
    source,
    adjustments,
    client_request_id
  ) values (
    p_household_id,
    v_actor_member_id,
    p_shopper_member_id,
    nullif(btrim(coalesce(p_merchant, '')), ''),
    p_purchase_date,
    round(p_total_amount, 2),
    upper(btrim(p_currency)),
    null,
    nullif(btrim(coalesce(p_source, '')), ''),
    coalesce(p_adjustments, '[]'::jsonb),
    p_client_request_id
  )
  returning id into v_receipt_id;

  insert into public.shopping_sessions(
    household_id,
    shopper_member_id,
    first_bought_at,
    last_bought_at,
    item_count,
    state,
    total_amount,
    purchase_date
  ) values (
    p_household_id,
    p_shopper_member_id,
    v_now,
    v_now,
    v_item_count,
    'pending',
    round(p_total_amount, 2),
    p_purchase_date
  )
  returning id into v_session_id;

  for v_item in
    select value from jsonb_array_elements(p_items)
  loop
    v_name := btrim(v_item->>'name');
    v_quantity := case
      when nullif(v_item->>'quantity', '') is null then null
      else (v_item->>'quantity')::numeric
    end;
    v_unit := nullif(btrim(coalesce(v_item->>'unit', '')), '');
    v_unit_price := case
      when nullif(v_item->>'unitPrice', '') is null then null
      else (v_item->>'unitPrice')::numeric
    end;
    v_line_total := (v_item->>'lineTotal')::numeric;

    insert into public.shopping_items(
      household_id,
      name,
      quantity,
      status,
      bought_at,
      receipt_id,
      unit_price,
      bought_by_member_id,
      shopping_session_id,
      receipt_quantity,
      receipt_unit,
      line_total,
      store_name
    ) values (
      p_household_id,
      v_name,
      case
        when v_quantity is null then null
        when v_unit is null then trim(to_char(v_quantity, 'FM999999990.###'))
        else trim(to_char(v_quantity, 'FM999999990.###')) || ' ' || v_unit
      end,
      'bought',
      v_now,
      v_receipt_id,
      v_unit_price,
      p_shopper_member_id,
      v_session_id,
      v_quantity,
      v_unit,
      round(v_line_total, 2),
      nullif(btrim(coalesce(p_merchant, '')), '')
    );
  end loop;

  return v_receipt_id;
end;
$$;

-- Finance reste une action séparée et explicitement confirmée.
-- Lorsqu'une session provient d'un ticket Scan V3, la date imprimée
-- sur le ticket est préférée à la date technique de confirmation.
create or replace function public.dabo_record_shopping_session_expense(
  p_session_id uuid,
  p_amount numeric,
  p_paid_by_member_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.shopping_sessions%rowtype;
  v_actor_member_id uuid;
  v_transaction_id uuid;
  v_occurred_on date;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  select *
  into v_session
  from public.shopping_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Shopping session not found';
  end if;

  select m.id
  into v_actor_member_id
  from public.members m
  where m.household_id = v_session.household_id
    and m.user_id = auth.uid()
    and m.left_at is null
  limit 1;

  if v_actor_member_id is null then
    raise exception 'Active household member required';
  end if;

  if not exists (
    select 1
    from public.members m
    where m.id = p_paid_by_member_id
      and m.household_id = v_session.household_id
      and m.left_at is null
  ) then
    raise exception 'Payer must belong to household';
  end if;

  if v_session.finance_transaction_id is not null then
    return v_session.finance_transaction_id;
  end if;

  if v_session.state <> 'pending' then
    raise exception 'Shopping session is no longer pending';
  end if;

  v_occurred_on := coalesce(
    v_session.purchase_date,
    (v_session.last_bought_at at time zone 'Europe/Brussels')::date
  );

  insert into public.finance_transactions(
    household_id,
    created_by_member_id,
    paid_by_member_id,
    amount,
    currency,
    category,
    label,
    occurred_on,
    source,
    status,
    visibility,
    shopping_session_id
  ) values (
    v_session.household_id,
    v_actor_member_id,
    p_paid_by_member_id,
    round(p_amount, 2),
    'EUR',
    'courses',
    'Courses',
    v_occurred_on,
    'shopping_session',
    'posted',
    'household',
    v_session.id
  )
  returning id into v_transaction_id;

  update public.shopping_sessions
  set state = 'recorded',
      total_amount = round(p_amount, 2),
      finance_transaction_id = v_transaction_id,
      prompted_at = now(),
      updated_at = now()
  where id = v_session.id;

  return v_transaction_id;
end;
$$;

revoke all on function public.dabo_import_confirmed_receipt(
  uuid,uuid,text,date,numeric,text,text,text,jsonb,jsonb,uuid
) from public;

grant execute on function public.dabo_import_confirmed_receipt(
  uuid,uuid,text,date,numeric,text,text,text,jsonb,jsonb,uuid
) to authenticated;

revoke all on function public.dabo_record_shopping_session_expense(
  uuid,numeric,uuid
) from public;

grant execute on function public.dabo_record_shopping_session_expense(
  uuid,numeric,uuid
) to authenticated;

commit;
