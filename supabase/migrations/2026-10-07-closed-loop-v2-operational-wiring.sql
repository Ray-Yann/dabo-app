-- DABO Closed Loop V2 — operational wiring.
-- Resource truth changes refresh linked household needs automatically.
-- The trigger path owns no product decision: it only recomputes deterministic truth.

begin;

-- Household needs are shared. Private calendar/finance resources must never be
-- referenced by their shared action graph, otherwise their existence could leak.
do $$
begin
  if exists (
    select 1
    from public.household_need_actions a
    join public.calendar_events e on e.id=a.resource_id
    where a.resource_type='calendar_event'
      and e.visibility<>'household'
  ) or exists (
    select 1
    from public.household_need_actions a
    join public.finance_bills b on b.id=a.resource_id
    where a.resource_type='finance_bill'
      and b.visibility<>'household'
  ) or exists (
    select 1
    from public.household_need_actions a
    join public.finance_transactions t on t.id=a.resource_id
    where a.resource_type='finance_transaction'
      and t.visibility<>'household'
  ) then
    raise exception 'CLOSED_LOOP_PRIVATE_RESOURCE_ALREADY_LINKED' using errcode='23514';
  end if;
end;
$$;

create or replace function public.closed_loop_validate_resource()
returns trigger
language plpgsql
security invoker
set search_path=public
as $$
begin
  if new.resource_type='human_confirmation' then
    if new.resource_id is not null then
      raise exception 'CLOSED_LOOP_CONFIRMATION_RESOURCE_INVALID' using errcode='23514';
    end if;
    return new;
  end if;

  if new.resource_type='task' and not exists(
    select 1 from public.tasks r
    where r.id=new.resource_id and r.household_id=new.household_id
  ) then
    raise exception 'CLOSED_LOOP_RESOURCE_INVALID' using errcode='23514';
  elsif new.resource_type='shopping_item' and not exists(
    select 1 from public.shopping_items r
    where r.id=new.resource_id and r.household_id=new.household_id
  ) then
    raise exception 'CLOSED_LOOP_RESOURCE_INVALID' using errcode='23514';
  elsif new.resource_type='calendar_event' and not exists(
    select 1 from public.calendar_events r
    where r.id=new.resource_id
      and r.household_id=new.household_id
      and r.visibility='household'
  ) then
    raise exception 'CLOSED_LOOP_RESOURCE_INVALID' using errcode='23514';
  elsif new.resource_type='finance_bill' and not exists(
    select 1 from public.finance_bills r
    where r.id=new.resource_id
      and r.household_id=new.household_id
      and r.visibility='household'
  ) then
    raise exception 'CLOSED_LOOP_RESOURCE_INVALID' using errcode='23514';
  elsif new.resource_type='finance_transaction' and not exists(
    select 1 from public.finance_transactions r
    where r.id=new.resource_id
      and r.household_id=new.household_id
      and r.visibility='household'
  ) then
    raise exception 'CLOSED_LOOP_RESOURCE_INVALID' using errcode='23514';
  end if;

  return new;
end;
$$;

-- Keep the SQL truth model aligned with the pure TypeScript engine and with
-- household privacy. Calendar events remain planning/progress, never proof.
create or replace function public.closed_loop_resource_satisfied(
  p_household_id uuid,
  p_resource_type text,
  p_resource_id uuid,
  p_human_confirmed_at timestamptz
)
returns boolean
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
declare
  v_satisfied boolean := false;
begin
  if p_resource_type='human_confirmation' then
    return p_human_confirmed_at is not null;
  elsif p_resource_id is null then
    return false;
  elsif p_resource_type='task' then
    select coalesce(t.status='done' and t.completed_at is not null,false)
      into v_satisfied
    from public.tasks t
    where t.id=p_resource_id and t.household_id=p_household_id;
  elsif p_resource_type='shopping_item' then
    select coalesce(s.status='bought' and s.bought_at is not null,false)
      into v_satisfied
    from public.shopping_items s
    where s.id=p_resource_id and s.household_id=p_household_id;
  elsif p_resource_type='calendar_event' then
    return false;
  elsif p_resource_type='finance_bill' then
    select coalesce(b.status='paid' and b.paid_transaction_id is not null,false)
      into v_satisfied
    from public.finance_bills b
    where b.id=p_resource_id
      and b.household_id=p_household_id
      and b.visibility='household';
  elsif p_resource_type='finance_transaction' then
    select coalesce(t.status='posted',false)
      into v_satisfied
    from public.finance_transactions t
    where t.id=p_resource_id
      and t.household_id=p_household_id
      and t.visibility='household';
  end if;

  return coalesce(v_satisfied,false);
end;
$$;

revoke all on function public.closed_loop_resource_satisfied(uuid,text,uuid,timestamptz) from public;

-- Internal recomputation used by both authenticated RPCs and database triggers.
-- It accepts only a need id; the desired status is always derived from current truth.
create or replace function public.closed_loop_refresh_need_system(p_need_id uuid)
returns text
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_need public.household_needs%rowtype;
  v_active_count integer := 0;
  v_business_resolution_count integer := 0;
  v_remaining_required integer := 0;
  v_any_satisfied boolean := false;
  v_confirmation_required boolean := false;
  v_confirmation_satisfied boolean := false;
  v_new_status text;
begin
  select * into v_need
  from public.household_needs
  where id=p_need_id
  for update;

  if not found then
    return null;
  end if;

  if v_need.status='cancelled' then
    return 'cancelled';
  end if;

  select
    count(*),
    count(*) filter (
      where a.resource_type<>'human_confirmation'
        and a.role in ('required','resolves')
    ),
    count(*) filter (
      where a.resource_type<>'human_confirmation'
        and a.role in ('required','resolves')
        and not public.closed_loop_resource_satisfied(
          a.household_id,a.resource_type,a.resource_id,a.human_confirmed_at
        )
    ),
    coalesce(bool_or(
      public.closed_loop_resource_satisfied(
        a.household_id,a.resource_type,a.resource_id,a.human_confirmed_at
      )
    ),false),
    coalesce(bool_or(
      a.resource_type='human_confirmation' and a.role='resolves'
    ),false),
    coalesce(bool_or(
      a.resource_type='human_confirmation'
      and a.role='resolves'
      and a.human_confirmed_at is not null
    ),false)
  into
    v_active_count,
    v_business_resolution_count,
    v_remaining_required,
    v_any_satisfied,
    v_confirmation_required,
    v_confirmation_satisfied
  from public.household_need_actions a
  where a.need_id=v_need.id;

  if v_active_count=0 then
    v_new_status := 'open';
  elsif v_need.resolution_mode='deterministic'
        and v_business_resolution_count=0 then
    v_new_status := case when v_any_satisfied then 'in_progress' else 'open' end;
  elsif v_remaining_required>0 then
    if v_need.resolution_mode='human_required' then
      update public.household_need_actions
      set human_confirmed_at=null,
          human_confirmed_by=null
      where need_id=v_need.id
        and household_id=v_need.household_id
        and resource_type='human_confirmation'
        and role='resolves'
        and human_confirmed_at is not null;

      v_confirmation_satisfied := false;
    end if;

    v_new_status := case when v_any_satisfied then 'in_progress' else 'open' end;
  elsif v_need.resolution_mode='human_required'
        and (not v_confirmation_required or not v_confirmation_satisfied) then
    v_new_status := 'awaiting_confirmation';
  else
    v_new_status := 'resolved';
  end if;

  update public.household_needs
  set status=v_new_status,
      resolved_at=case when v_new_status='resolved'
                       then coalesce(resolved_at,now())
                       else null end,
      cancelled_at=null
  where id=v_need.id;

  return v_new_status;
end;
$$;

revoke all on function public.closed_loop_refresh_need_system(uuid) from public;
revoke all on function public.closed_loop_refresh_need_system(uuid) from anon;
revoke all on function public.closed_loop_refresh_need_system(uuid) from authenticated;

-- Public refresh remains membership-gated, but delegates all truth calculation to
-- the same internal function used by automatic operational wiring.
create or replace function public.closed_loop_refresh_need(p_need_id uuid)
returns text
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_household_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode='28000';
  end if;

  select n.household_id into v_household_id
  from public.household_needs n
  where n.id=p_need_id;

  if v_household_id is null then
    raise exception 'CLOSED_LOOP_NEED_NOT_FOUND' using errcode='P0002';
  end if;

  if not exists(
    select 1 from public.members m
    where m.household_id=v_household_id
      and m.user_id=auth.uid()
      and m.left_at is null
  ) then
    raise exception 'HOUSEHOLD_MEMBER_REQUIRED' using errcode='42501';
  end if;

  return public.closed_loop_refresh_need_system(p_need_id);
end;
$$;

revoke all on function public.closed_loop_refresh_need(uuid) from public;
grant execute on function public.closed_loop_refresh_need(uuid) to authenticated;

-- Resource changes automatically propagate to every linked need. A completion can
-- resolve; an undo/void/delete can reopen. No browser/API caller needs to remember
-- to refresh the Closed Loop graph.
create or replace function public.closed_loop_refresh_from_resource()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_resource_type text := tg_argv[0];
  v_resource_id uuid;
  v_household_id uuid;
  v_need_id uuid;
begin
  if tg_op='DELETE' then
    v_resource_id := old.id;
    v_household_id := old.household_id;
  else
    v_resource_id := new.id;
    v_household_id := new.household_id;
  end if;

  for v_need_id in
    select distinct a.need_id
    from public.household_need_actions a
    where a.household_id=v_household_id
      and a.resource_type=v_resource_type
      and a.resource_id=v_resource_id
  loop
    perform public.closed_loop_refresh_need_system(v_need_id);
  end loop;

  if tg_op='DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.closed_loop_refresh_from_resource() from public;
revoke all on function public.closed_loop_refresh_from_resource() from anon;
revoke all on function public.closed_loop_refresh_from_resource() from authenticated;

-- A newly linked action must immediately contribute its current resource truth.
create or replace function public.closed_loop_refresh_from_action_insert()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  perform public.closed_loop_refresh_need_system(new.need_id);
  return new;
end;
$$;

revoke all on function public.closed_loop_refresh_from_action_insert() from public;
revoke all on function public.closed_loop_refresh_from_action_insert() from anon;
revoke all on function public.closed_loop_refresh_from_action_insert() from authenticated;

drop trigger if exists closed_loop_refresh_action_insert on public.household_need_actions;
create trigger closed_loop_refresh_action_insert
after insert on public.household_need_actions
for each row execute function public.closed_loop_refresh_from_action_insert();

drop trigger if exists closed_loop_refresh_task on public.tasks;
create trigger closed_loop_refresh_task
after update of status,completed_at or delete on public.tasks
for each row execute function public.closed_loop_refresh_from_resource('task');

drop trigger if exists closed_loop_refresh_shopping_item on public.shopping_items;
create trigger closed_loop_refresh_shopping_item
after update of status,bought_at or delete on public.shopping_items
for each row execute function public.closed_loop_refresh_from_resource('shopping_item');

drop trigger if exists closed_loop_refresh_finance_bill on public.finance_bills;
create trigger closed_loop_refresh_finance_bill
after update of status,paid_transaction_id or delete on public.finance_bills
for each row execute function public.closed_loop_refresh_from_resource('finance_bill');

drop trigger if exists closed_loop_refresh_finance_transaction on public.finance_transactions;
create trigger closed_loop_refresh_finance_transaction
after update of status or delete on public.finance_transactions
for each row execute function public.closed_loop_refresh_from_resource('finance_transaction');

-- Calendar remains wired as planning/progress only. Deleting a linked event still
-- refreshes the need so the graph cannot silently retain stale operational context.
drop trigger if exists closed_loop_refresh_calendar_event on public.calendar_events;
create trigger closed_loop_refresh_calendar_event
after delete on public.calendar_events
for each row execute function public.closed_loop_refresh_from_resource('calendar_event');

commit;
