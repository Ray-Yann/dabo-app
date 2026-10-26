-- DABO Courses -> Mes reserves V1.1
-- Apply after 20261020_courses_reserves_v1 and 20261021_courses_reserves_partial_transfer_v1.
-- Does not retroactively import historical purchases.
-- Existing status RPC signature/return value and finance session logic are preserved.

-- Version the already-applied safety fix: location changes must use partial-transfer RPC.
create or replace function public.pantry_stock_change(
  p_household uuid, p_stock uuid, p_delta numeric, p_destination uuid default null
) returns numeric language plpgsql security definer set search_path = '' as $$
declare v_stock public.pantry_stocks%rowtype; v_after numeric;
begin
  if auth.uid() is null or not exists (
    select 1 from public.members m where m.household_id=p_household
    and m.user_id=auth.uid() and m.left_at is null
  ) then raise exception 'Not authorized'; end if;
  if p_destination is not null then
    raise exception 'Use pantry_stock_transfer_partial for transfers';
  end if;
  select * into v_stock from public.pantry_stocks
  where id=p_stock and household_id=p_household for update;
  if not found then raise exception 'Stock not found'; end if;
  if p_delta is null or p_delta::text in ('NaN','Infinity','-Infinity')
    or abs(p_delta)>1000000 or p_delta<>round(p_delta,3)
    or (v_stock.unit='piece' and p_delta<>trunc(p_delta))
  then raise exception 'Invalid delta'; end if;
  if p_delta=0 then raise exception 'No change'; end if;
  v_after:=v_stock.quantity+p_delta;
  if v_after<0 or v_after>1000000 then raise exception 'Insufficient or excessive quantity'; end if;
  update public.pantry_stocks set quantity=v_after,updated_at=now() where id=p_stock;
  insert into public.pantry_movements
    (household_id,stock_id,actor_id,action,delta,quantity_after,previous_location_id,location_id)
  values (p_household,p_stock,auth.uid(),case when p_delta>0 then 'added' else 'consumed' end,
    p_delta,v_after,v_stock.location_id,v_stock.location_id);
  return v_after;
end $$;

-- One durable ledger entry per shopping item. A purchase is never credited twice,
-- including retries, concurrent clients and offline queue replays.
create table if not exists public.pantry_purchase_sync (
  id uuid primary key default gen_random_uuid(),
  shopping_item_id uuid references public.shopping_items(id) on delete set null,
  source_item_id uuid not null,
  purchase_cycle integer not null default 1 check (purchase_cycle >= 1),
  household_id uuid not null references public.households(id) on delete cascade,
  stock_id uuid,
  movement_id uuid,
  reversal_movement_id uuid,
  quantity numeric(12,3),
  unit text,
  state text not null check (state in ('stocked','needs_quantity','correction_needed','reversed')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (stock_id,household_id) references public.pantry_stocks(id,household_id),
  foreign key (movement_id) references public.pantry_movements(id),
  foreign key (reversal_movement_id) references public.pantry_movements(id)
);
create unique index if not exists pantry_purchase_sync_current_item
  on public.pantry_purchase_sync(shopping_item_id) where shopping_item_id is not null;
create index if not exists pantry_purchase_sync_household on public.pantry_purchase_sync(household_id,state);
alter table public.pantry_purchase_sync enable row level security;
revoke all on public.pantry_purchase_sync from public,anon,authenticated;
grant select on public.pantry_purchase_sync to authenticated;
create policy pantry_purchase_sync_read on public.pantry_purchase_sync for select to authenticated using (
  exists(select 1 from public.members m where m.household_id=pantry_purchase_sync.household_id
    and m.user_id=auth.uid() and m.left_at is null)
);

-- Helper is private to callers: no direct EXECUTE for authenticated.
create or replace function public.dabo_pantry_credit_purchase(p_item_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_item public.shopping_items%rowtype;
  v_raw text;
  v_match text[];
  v_qty numeric;
  v_unit text;
  v_location uuid;
  v_stock public.pantry_stocks%rowtype;
  v_stock_id uuid;
  v_after numeric;
  v_movement uuid;
  v_existing boolean := false;
  v_previous_cycle integer := 0;
begin
  select * into v_item from public.shopping_items where id=p_item_id for update;
  if not found or v_item.status <> 'bought' then return; end if;
  if auth.uid() is null or not exists (
    select 1 from public.members m where m.household_id=v_item.household_id
      and m.user_id=auth.uid() and m.left_at is null
  ) then raise exception 'Not authorized'; end if;
  -- Lock household-level stock merging, including concurrent purchases of different items.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_item.household_id::text,1729));
  if exists (select 1 from public.pantry_purchase_sync
    where shopping_item_id=p_item_id and state in ('stocked','needs_quantity')) then return; end if;
  -- A new bought transition is a new purchase. Keep the old audit row,
  -- including unresolved corrections, instead of silently suppressing the credit.
  select coalesce(max(purchase_cycle),0) into v_previous_cycle
  from public.pantry_purchase_sync where source_item_id=p_item_id;
  update public.pantry_purchase_sync set shopping_item_id=null,updated_at=now()
  where shopping_item_id=p_item_id and state in ('correction_needed','reversed');

  -- Prefer structured receipt quantity ONLY if unit is explicitly recognized.
  if v_item.receipt_quantity is not null and v_item.receipt_unit is not null then
    v_raw:=btrim(v_item.receipt_unit);
    if lower(v_raw) in ('piece','pieces','pièce','pièces','pcs','pc','unité','unités','unit') then v_unit:='piece';
    elsif lower(v_raw) in ('g','gramme','grammes') then v_unit:='g';
    elsif lower(v_raw) in ('kg','kilogramme','kilogrammes') then v_unit:='kg';
    elsif lower(v_raw) in ('ml','millilitre','millilitres') then v_unit:='ml';
    elsif lower(v_raw) in ('l','litre','litres') then v_unit:='l'; end if;
    if v_unit is not null then v_qty:=v_item.receipt_quantity; end if;
  end if;

  if v_qty is null then
    v_raw:=lower(btrim(coalesce(v_item.quantity,'')));
    -- Strictly anchored formats: never silently interpret '2 de chaque', 'paquet de 6', etc.
    v_match:=regexp_match(v_raw, '^([0-9]+(?:[.,][0-9]{1,3})?)\s*(kg|kilogrammes?|g|grammes?|ml|millilitres?|l|litres?)$');
    if v_match is not null then
      v_qty:=replace(v_match[1],',','.')::numeric;
      v_unit:=case
        when v_match[2] in ('kg','kilogramme','kilogrammes') then 'kg'
        when v_match[2] in ('g','gramme','grammes') then 'g'
        when v_match[2] in ('ml','millilitre','millilitres') then 'ml'
        else 'l' end;
    else
      v_match:=regexp_match(v_raw, '^([0-9]+)\s*(pièces?|pieces?|pcs?|unités?|unites?|boîtes?|boites?|bouteilles?|paquets?|sachets?|pots?|raviers?|sacs?|casiers?|morceaux?)?$');
      if v_match is not null then
        v_qty:=v_match[1]::numeric; v_unit:='piece';
      end if;
    end if;
  end if;

  if v_qty is null or v_qty::text in ('NaN','Infinity','-Infinity')
    or v_qty<=0 or v_qty>1000000 or v_qty<>round(v_qty,3)
    or (v_unit='piece' and v_qty<>trunc(v_qty))
    or char_length(btrim(v_item.name)) not between 1 and 120
  then
    insert into public.pantry_purchase_sync(shopping_item_id,source_item_id,household_id,purchase_cycle,state,note)
    values(p_item_id,p_item_id,v_item.household_id,v_previous_cycle+1,'needs_quantity','Quantité ou produit à confirmer');
    return;
  end if;

  select id into v_location from public.pantry_locations
  where household_id=v_item.household_id and kind='other' and name='À ranger'
  order by created_at,id limit 1;
  if v_location is null then
    insert into public.pantry_locations(household_id,name,kind)
    values(v_item.household_id,'À ranger','other') returning id into v_location;
  end if;
  -- Match only within the staging location and the same unit, with no expiry.
  select * into v_stock from public.pantry_stocks
  where household_id=v_item.household_id and location_id=v_location
    and lower(btrim(name))=lower(btrim(v_item.name))
    and unit=v_unit and expires_on is null
  order by created_at,id limit 1 for update;
  if found then
    v_existing:=true;
    v_after:=v_stock.quantity+v_qty;
    if v_after>1000000 then raise exception 'Stock limit exceeded'; end if;
    update public.pantry_stocks set quantity=v_after,updated_at=now() where id=v_stock.id;
    v_stock_id:=v_stock.id;
  else
    insert into public.pantry_stocks(household_id,location_id,name,quantity,unit)
    values(v_item.household_id,v_location,btrim(v_item.name),v_qty,v_unit)
    returning id into v_stock_id;
    v_after:=v_qty;
  end if;
  insert into public.pantry_movements(household_id,stock_id,actor_id,action,delta,quantity_after,location_id)
  values(v_item.household_id,v_stock_id,auth.uid(),case when v_existing then 'added' else 'created' end,
    v_qty,v_after,v_location) returning id into v_movement;
  insert into public.pantry_purchase_sync
    (shopping_item_id,source_item_id,household_id,purchase_cycle,stock_id,movement_id,quantity,unit,state)
  values (p_item_id,p_item_id,v_item.household_id,v_previous_cycle+1,v_stock_id,v_movement,v_qty,v_unit,'stocked');
end $$;
revoke all on function public.dabo_pantry_credit_purchase(uuid) from public,anon,authenticated;

-- Preserve the existing finance session behavior, adding a credit only on the first
-- transition to bought. Cancellation is flagged for review, never blindly subtracted.
create or replace function public.dabo_set_shopping_item_status(p_item_id uuid,p_status text)
returns uuid language plpgsql security definer set search_path = 'public' as $$
declare
  v_item public.shopping_items%rowtype;
  v_member_id uuid;
  v_session_id uuid;
  v_now timestamptz := now();
  v_count integer;
  v_first timestamptz;
  v_last timestamptz;
begin
  if p_status not in ('to_buy','bought') then raise exception 'Invalid shopping status'; end if;
  select * into v_item from public.shopping_items where id=p_item_id for update;
  if not found then raise exception 'Shopping item not found'; end if;
  select m.id into v_member_id from public.members m
  where m.household_id=v_item.household_id and m.user_id=auth.uid() and m.left_at is null limit 1;
  if v_member_id is null then raise exception 'Active household member required'; end if;
  if p_status='to_buy' then
    v_session_id:=v_item.shopping_session_id;
    update public.shopping_items set status='to_buy',bought_at=null,
      bought_by_member_id=null,shopping_session_id=null where id=p_item_id;
    -- Safe reversal only when the credited movement is still the latest
    -- movement for this stock and the original quantity is available.
    -- Otherwise retain the credit and flag a human correction.
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(v_item.household_id::text,1729));
    declare
      v_credit public.pantry_purchase_sync%rowtype;
      v_stock public.pantry_stocks%rowtype;
      v_reverse_id uuid;
      v_after numeric;
    begin
      select * into v_credit from public.pantry_purchase_sync
      where shopping_item_id=p_item_id for update;
      if found and v_credit.state='stocked' then
        select * into v_stock from public.pantry_stocks
        where id=v_credit.stock_id and household_id=v_item.household_id for update;
        if found and v_stock.quantity>=v_credit.quantity and
          (select pm.id from public.pantry_movements pm
           where pm.stock_id=v_stock.id order by pm.created_at desc,pm.id desc limit 1)
          = v_credit.movement_id then
          v_after:=v_stock.quantity-v_credit.quantity;
          update public.pantry_stocks set quantity=v_after,updated_at=v_now where id=v_stock.id;
          insert into public.pantry_movements
            (household_id,stock_id,actor_id,action,delta,quantity_after,previous_location_id,location_id)
          values(v_item.household_id,v_stock.id,auth.uid(),'consumed',
            -v_credit.quantity,v_after,v_stock.location_id,v_stock.location_id)
          returning id into v_reverse_id;
          update public.pantry_purchase_sync set state='reversed',
            reversal_movement_id=v_reverse_id,note='Achat annulé : crédit compensé',updated_at=v_now
          where id=v_credit.id;
        else
          update public.pantry_purchase_sync set state='correction_needed',
            note='Achat annulé : stock modifié depuis le crédit, vérification nécessaire',updated_at=v_now
          where id=v_credit.id;
        end if;
      elsif found and v_credit.state='needs_quantity' then
        update public.pantry_purchase_sync set state='reversed',
          note='Achat annulé avant confirmation de la quantité',updated_at=v_now
        where id=v_credit.id;
      end if;
    end;
    if v_session_id is not null then
      select count(*),min(bought_at),max(bought_at) into v_count,v_first,v_last
      from public.shopping_items where shopping_session_id=v_session_id
        and status='bought' and id<>p_item_id;
      if v_count=0 then
        delete from public.shopping_sessions
        where id=v_session_id and state='pending' and finance_transaction_id is null;
      else
        update public.shopping_sessions set item_count=v_count,
          first_bought_at=coalesce(v_first,first_bought_at),
          last_bought_at=coalesce(v_last,last_bought_at),prompted_at=null,updated_at=v_now
        where id=v_session_id and state='pending';
      end if;
    end if;
    return null;
  end if;
  if v_item.status='bought' then return v_item.shopping_session_id; end if;
  select s.id into v_session_id from public.shopping_sessions s
  where s.household_id=v_item.household_id and s.shopper_member_id=v_member_id
    and s.state='pending' and s.finance_transaction_id is null
    and s.last_bought_at>=v_now-interval '8 hours'
  order by s.last_bought_at desc limit 1 for update;
  if v_session_id is null then
    insert into public.shopping_sessions(household_id,shopper_member_id,first_bought_at,last_bought_at,item_count,state)
    values(v_item.household_id,v_member_id,v_now,v_now,1,'pending') returning id into v_session_id;
  else
    update public.shopping_sessions set last_bought_at=v_now,item_count=item_count+1,
      prompted_at=null,updated_at=v_now where id=v_session_id;
  end if;
  update public.shopping_items set status='bought',bought_at=v_now,
    bought_by_member_id=v_member_id,shopping_session_id=v_session_id where id=p_item_id;
  perform public.dabo_pantry_credit_purchase(p_item_id);
  return v_session_id;
end $$;
revoke all on function public.dabo_set_shopping_item_status(uuid,text) from public,anon;
grant execute on function public.dabo_set_shopping_item_status(uuid,text) to authenticated;
