-- DABO Finance V1 — pont Courses → Finance
-- Migration ciblée : suit une session d'achats et enregistre une seule dépense Courses après confirmation.

begin;

alter table public.shopping_items
  add column if not exists shopping_session_id uuid references public.shopping_sessions(id) on delete set null;

create index if not exists shopping_items_shopping_session_idx
  on public.shopping_items(shopping_session_id)
  where shopping_session_id is not null;

create or replace function public.dabo_set_shopping_item_status(
  p_item_id uuid,
  p_status text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.shopping_items%rowtype;
  v_member_id uuid;
  v_session_id uuid;
  v_now timestamptz := now();
  v_count integer;
  v_first timestamptz;
  v_last timestamptz;
begin
  if p_status not in ('to_buy','bought') then
    raise exception 'Invalid shopping status';
  end if;

  select * into v_item from public.shopping_items where id = p_item_id for update;
  if not found then raise exception 'Shopping item not found'; end if;

  select m.id into v_member_id
  from public.members m
  where m.household_id = v_item.household_id
    and m.user_id = auth.uid()
    and m.left_at is null
  limit 1;

  if v_member_id is null then raise exception 'Active household member required'; end if;

  if p_status = 'to_buy' then
    v_session_id := v_item.shopping_session_id;

    update public.shopping_items
    set status = 'to_buy', bought_at = null, bought_by_member_id = null, shopping_session_id = null
    where id = p_item_id;

    if v_session_id is not null then
      select count(*), min(bought_at), max(bought_at)
      into v_count, v_first, v_last
      from public.shopping_items
      where shopping_session_id = v_session_id
        and status = 'bought'
        and id <> p_item_id;

      if v_count = 0 then
        delete from public.shopping_sessions
        where id = v_session_id and state = 'pending' and finance_transaction_id is null;
      else
        update public.shopping_sessions
        set item_count = v_count,
            first_bought_at = coalesce(v_first, first_bought_at),
            last_bought_at = coalesce(v_last, last_bought_at),
            prompted_at = null,
            updated_at = v_now
        where id = v_session_id and state = 'pending';
      end if;
    end if;

    return null;
  end if;

  if v_item.status = 'bought' then return v_item.shopping_session_id; end if;

  select s.id into v_session_id
  from public.shopping_sessions s
  where s.household_id = v_item.household_id
    and s.shopper_member_id = v_member_id
    and s.state = 'pending'
    and s.finance_transaction_id is null
    and s.last_bought_at >= v_now - interval '8 hours'
  order by s.last_bought_at desc
  limit 1
  for update;

  if v_session_id is null then
    insert into public.shopping_sessions(
      household_id, shopper_member_id, first_bought_at, last_bought_at, item_count, state
    ) values (
      v_item.household_id, v_member_id, v_now, v_now, 1, 'pending'
    ) returning id into v_session_id;
  else
    update public.shopping_sessions
    set last_bought_at = v_now,
        item_count = item_count + 1,
        prompted_at = null,
        updated_at = v_now
    where id = v_session_id;
  end if;

  update public.shopping_items
  set status = 'bought',
      bought_at = v_now,
      bought_by_member_id = v_member_id,
      shopping_session_id = v_session_id
  where id = p_item_id;

  return v_session_id;
end;
$$;

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
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;

  select * into v_session from public.shopping_sessions where id = p_session_id for update;
  if not found then raise exception 'Shopping session not found'; end if;

  select m.id into v_actor_member_id
  from public.members m
  where m.household_id = v_session.household_id
    and m.user_id = auth.uid()
    and m.left_at is null
  limit 1;
  if v_actor_member_id is null then raise exception 'Active household member required'; end if;

  if not exists (
    select 1 from public.members m
    where m.id = p_paid_by_member_id
      and m.household_id = v_session.household_id
      and m.left_at is null
  ) then raise exception 'Payer must belong to household'; end if;

  if v_session.finance_transaction_id is not null then return v_session.finance_transaction_id; end if;
  if v_session.state <> 'pending' then raise exception 'Shopping session is no longer pending'; end if;

  v_occurred_on := (v_session.last_bought_at at time zone 'Europe/Brussels')::date;

  insert into public.finance_transactions(
    household_id, created_by_member_id, paid_by_member_id, amount, currency,
    category, label, occurred_on, source, status, visibility, shopping_session_id
  ) values (
    v_session.household_id, v_actor_member_id, p_paid_by_member_id, round(p_amount, 2), 'EUR',
    'courses', 'Courses', v_occurred_on, 'shopping_session', 'posted', 'household', v_session.id
  ) returning id into v_transaction_id;

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

revoke all on function public.dabo_set_shopping_item_status(uuid,text) from public;
revoke all on function public.dabo_record_shopping_session_expense(uuid,numeric,uuid) from public;
grant execute on function public.dabo_set_shopping_item_status(uuid,text) to authenticated;
grant execute on function public.dabo_record_shopping_session_expense(uuid,numeric,uuid) to authenticated;

commit;
