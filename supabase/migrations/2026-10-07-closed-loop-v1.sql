-- DABO Closed Loop V1 ? durable need graph.
-- Reasoning may propose plans. Resolution truth is derived from current household resources
-- or from an explicit, attributable human confirmation. Clients cannot manufacture truth.

begin;

create table if not exists public.household_needs(
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null check(char_length(btrim(title)) between 1 and 240),
  status text not null default 'open'
    check(status in('open','in_progress','awaiting_confirmation','resolved','cancelled')),
  resolution_mode text not null default 'human_required'
    check(resolution_mode in('deterministic','human_required')),
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  cancelled_at timestamptz,
  check((status='resolved')=(resolved_at is not null)),
  check((status='cancelled')=(cancelled_at is not null)),
  check(not (resolved_at is not null and cancelled_at is not null))
);

create index if not exists household_needs_active_idx
  on public.household_needs(household_id,status,created_at desc);

create table if not exists public.household_need_actions(
  id uuid primary key default gen_random_uuid(),
  need_id uuid not null references public.household_needs(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  resource_type text not null
    check(resource_type in('task','shopping_item','calendar_event','finance_bill','finance_transaction','human_confirmation')),
  resource_id uuid,
  role text not null check(role in('progress','required','resolves','evidence')),
  position integer not null default 0 check(position>=0),
  human_confirmed_at timestamptz,
  human_confirmed_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  check(
    (resource_type='human_confirmation' and resource_id is null)
    or
    (resource_type<>'human_confirmation' and resource_id is not null)
  ),
  check(human_confirmed_at is null or resource_type='human_confirmation'),
  check(human_confirmed_by is null or resource_type='human_confirmation'),
  check((human_confirmed_at is null)=(human_confirmed_by is null)),
  unique(need_id,resource_type,resource_id)
);

create index if not exists household_need_actions_need_idx
  on public.household_need_actions(need_id,position);
create index if not exists household_need_actions_resource_idx
  on public.household_need_actions(household_id,resource_type,resource_id);

alter table public.household_needs enable row level security;
alter table public.household_need_actions enable row level security;

revoke all on public.household_needs from anon;
revoke all on public.household_need_actions from anon;

grant select,insert on public.household_needs to authenticated;
revoke update on table public.household_needs from authenticated;
revoke delete on table public.household_needs from authenticated;
grant update (title) on table public.household_needs to authenticated;

grant select,insert on public.household_need_actions to authenticated;
revoke truncate, references, trigger on table public.household_needs, public.household_need_actions from authenticated;
revoke update on table public.household_need_actions from authenticated;
revoke delete on table public.household_need_actions from authenticated;
grant update (position) on table public.household_need_actions to authenticated;

drop policy if exists "closed_loop_needs_member_select" on public.household_needs;
drop policy if exists "closed_loop_needs_member_insert" on public.household_needs;
drop policy if exists "closed_loop_needs_member_update" on public.household_needs;
drop policy if exists "closed_loop_needs_member_delete" on public.household_needs;
drop policy if exists "closed_loop_actions_member_select" on public.household_need_actions;
drop policy if exists "closed_loop_actions_member_insert" on public.household_need_actions;
drop policy if exists "closed_loop_actions_member_update" on public.household_need_actions;
drop policy if exists "closed_loop_actions_member_delete" on public.household_need_actions;

create policy "closed_loop_needs_member_select"
on public.household_needs for select to authenticated
using(
  exists(
    select 1 from public.members m
    where m.household_id=household_needs.household_id
      and m.user_id=auth.uid()
      and m.left_at is null
  )
);

create policy "closed_loop_needs_member_insert"
on public.household_needs for insert to authenticated
with check(
  status='open'
  and resolved_at is null
  and cancelled_at is null
  and exists(
    select 1 from public.members m
    where m.household_id=household_needs.household_id
      and m.user_id=auth.uid()
      and m.left_at is null
  )
  and exists(
    select 1 from public.members creator
    where creator.id=created_by
      and creator.household_id=household_needs.household_id
      and creator.user_id=auth.uid()
      and creator.left_at is null
  )
);

create policy "closed_loop_needs_member_update"
on public.household_needs for update to authenticated
using(
  exists(
    select 1 from public.members m
    where m.household_id=household_needs.household_id
      and m.user_id=auth.uid()
      and m.left_at is null
  )
)
with check(
  exists(
    select 1 from public.members m
    where m.household_id=household_needs.household_id
      and m.user_id=auth.uid()
      and m.left_at is null
  )
);

create policy "closed_loop_needs_member_delete"
on public.household_needs for delete to authenticated
using(
  exists(
    select 1 from public.members m
    where m.household_id=household_needs.household_id
      and m.user_id=auth.uid()
      and m.left_at is null
  )
);

create policy "closed_loop_actions_member_select"
on public.household_need_actions for select to authenticated
using(
  exists(
    select 1 from public.members m
    where m.household_id=household_need_actions.household_id
      and m.user_id=auth.uid()
      and m.left_at is null
  )
);

create policy "closed_loop_actions_member_insert"
on public.household_need_actions for insert to authenticated
with check(
  human_confirmed_at is null
  and human_confirmed_by is null
  and exists(
    select 1 from public.members m
    where m.household_id=household_need_actions.household_id
      and m.user_id=auth.uid()
      and m.left_at is null
  )
  and exists(
    select 1 from public.household_needs n
    where n.id=need_id
      and n.household_id=household_need_actions.household_id
      and n.status not in ('resolved','cancelled')
  )
);

create policy "closed_loop_actions_member_update"
on public.household_need_actions for update to authenticated
using(
  exists(
    select 1 from public.members m
    where m.household_id=household_need_actions.household_id
      and m.user_id=auth.uid()
      and m.left_at is null
  )
)
with check(
  exists(
    select 1 from public.members m
    where m.household_id=household_need_actions.household_id
      and m.user_id=auth.uid()
      and m.left_at is null
  )
  and exists(
    select 1 from public.household_needs n
    where n.id=need_id
      and n.household_id=household_need_actions.household_id
      and n.status not in ('resolved','cancelled')
  )
);

create policy "closed_loop_actions_member_delete"
on public.household_need_actions for delete to authenticated
using(
  exists(
    select 1 from public.members m
    where m.household_id=household_need_actions.household_id
      and m.user_id=auth.uid()
      and m.left_at is null
  )
);

-- Structural graph integrity: an action can never cross household boundaries.
create or replace function public.closed_loop_guard_action_household()
returns trigger
language plpgsql
security invoker
set search_path=public
as $$
begin
  if not exists(
    select 1 from public.household_needs n
    where n.id=new.need_id and n.household_id=new.household_id
  ) then
    raise exception 'CLOSED_LOOP_HOUSEHOLD_MISMATCH' using errcode='23514';
  end if;
  return new;
end;
$$;

drop trigger if exists closed_loop_guard_action_household
  on public.household_need_actions;
create trigger closed_loop_guard_action_household
before insert or update on public.household_need_actions
for each row execute function public.closed_loop_guard_action_household();

-- Keep updated_at trustworthy without relying on every UI caller.
create or replace function public.closed_loop_touch_need()
returns trigger
language plpgsql
security invoker
set search_path=public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists closed_loop_touch_need on public.household_needs;
create trigger closed_loop_touch_need
before update on public.household_needs
for each row execute function public.closed_loop_touch_need();

-- Validate every polymorphic resource against the same household.
-- Human confirmation is the only action without a resource_id.
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
    where r.id=new.resource_id and r.household_id=new.household_id
  ) then
    raise exception 'CLOSED_LOOP_RESOURCE_INVALID' using errcode='23514';
  elsif new.resource_type='finance_bill' and not exists(
    select 1 from public.finance_bills r
    where r.id=new.resource_id and r.household_id=new.household_id
  ) then
    raise exception 'CLOSED_LOOP_RESOURCE_INVALID' using errcode='23514';
  elsif new.resource_type='finance_transaction' and not exists(
    select 1 from public.finance_transactions r
    where r.id=new.resource_id and r.household_id=new.household_id
  ) then
    raise exception 'CLOSED_LOOP_RESOURCE_INVALID' using errcode='23514';
  end if;

  return new;
end;
$$;

drop trigger if exists closed_loop_validate_resource
  on public.household_need_actions;
create trigger closed_loop_validate_resource
before insert or update of resource_type,resource_id,household_id
on public.household_need_actions
for each row execute function public.closed_loop_validate_resource();

-- One source of truth for whether a linked resource is satisfied NOW.
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
    where b.id=p_resource_id and b.household_id=p_household_id;
  elsif p_resource_type='finance_transaction' then
    select coalesce(t.status='posted',false)
      into v_satisfied
    from public.finance_transactions t
    where t.id=p_resource_id and t.household_id=p_household_id;
  end if;

  return coalesce(v_satisfied,false);
end;
$$;

revoke all on function public.closed_loop_resource_satisfied(uuid,text,uuid,timestamptz) from public;

-- Recompute truth from current resources. No caller supplies the desired status.
create or replace function public.closed_loop_refresh_need(p_need_id uuid)
returns text
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_need public.household_needs%rowtype;
  v_actor_member_id uuid;
  v_active_count integer := 0;
  v_business_resolution_count integer := 0;
  v_required_count integer := 0;
  v_remaining_required integer := 0;
  v_any_satisfied boolean := false;
  v_confirmation_required boolean := false;
  v_confirmation_satisfied boolean := false;
  v_new_status text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode='28000';
  end if;

  select * into v_need
  from public.household_needs
  where id=p_need_id
  for update;

  if not found then
    raise exception 'CLOSED_LOOP_NEED_NOT_FOUND' using errcode='P0002';
  end if;

  select m.id into v_actor_member_id
  from public.members m
  where m.household_id=v_need.household_id
    and m.user_id=auth.uid()
    and m.left_at is null
  limit 1;

  if v_actor_member_id is null then
    raise exception 'HOUSEHOLD_MEMBER_REQUIRED' using errcode='42501';
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
    v_required_count,
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
    -- Evidence/progress alone can never prove resolution.
    v_new_status := case when v_any_satisfied then 'in_progress' else 'open' end;
  elsif v_remaining_required>0 then
    -- A previous human confirmation becomes stale as soon as a required
    -- real-world condition is no longer satisfied.
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

revoke all on function public.closed_loop_refresh_need(uuid) from public;
grant execute on function public.closed_loop_refresh_need(uuid) to authenticated;

-- Human truth is explicit and attributable. The client cannot set confirmation columns.
create or replace function public.closed_loop_confirm_need(p_need_id uuid)
returns text
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_need public.household_needs%rowtype;
  v_actor_member_id uuid;
  v_confirmation_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode='28000';
  end if;

  select * into v_need
  from public.household_needs
  where id=p_need_id
  for update;

  if not found then
    raise exception 'CLOSED_LOOP_NEED_NOT_FOUND' using errcode='P0002';
  end if;

  select m.id into v_actor_member_id
  from public.members m
  where m.household_id=v_need.household_id
    and m.user_id=auth.uid()
    and m.left_at is null
  limit 1;

  if v_actor_member_id is null then
    raise exception 'HOUSEHOLD_MEMBER_REQUIRED' using errcode='42501';
  end if;

  if v_need.status='cancelled' then
    raise exception 'CLOSED_LOOP_NEED_CANCELLED' using errcode='22023';
  end if;

  if v_need.resolution_mode<>'human_required' then
    raise exception 'CLOSED_LOOP_CONFIRMATION_NOT_REQUIRED' using errcode='22023';
  end if;

  select a.id into v_confirmation_id
  from public.household_need_actions a
  where a.need_id=v_need.id
    and a.household_id=v_need.household_id
    and a.resource_type='human_confirmation'
    and a.role='resolves'
  order by a.position,a.created_at
  limit 1
  for update;

  if v_confirmation_id is null then
    raise exception 'CLOSED_LOOP_CONFIRMATION_ACTION_REQUIRED' using errcode='22023';
  end if;

  update public.household_need_actions
  set human_confirmed_at=now(),
      human_confirmed_by=v_actor_member_id
  where id=v_confirmation_id;

  return public.closed_loop_refresh_need(v_need.id);
end;
$$;

revoke all on function public.closed_loop_confirm_need(uuid) from public;
grant execute on function public.closed_loop_confirm_need(uuid) to authenticated;

-- Cancellation is also a controlled truth transition.
create or replace function public.closed_loop_cancel_need(p_need_id uuid)
returns text
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_need public.household_needs%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode='28000';
  end if;

  select * into v_need
  from public.household_needs
  where id=p_need_id
  for update;

  if not found then
    raise exception 'CLOSED_LOOP_NEED_NOT_FOUND' using errcode='P0002';
  end if;

  if not exists(
    select 1 from public.members m
    where m.household_id=v_need.household_id
      and m.user_id=auth.uid()
      and m.left_at is null
  ) then
    raise exception 'HOUSEHOLD_MEMBER_REQUIRED' using errcode='42501';
  end if;

  update public.household_needs
  set status='cancelled',
      cancelled_at=now(),
      resolved_at=null
  where id=v_need.id;

  return 'cancelled';
end;
$$;

revoke all on function public.closed_loop_cancel_need(uuid) from public;
grant execute on function public.closed_loop_cancel_need(uuid) to authenticated;

commit;

