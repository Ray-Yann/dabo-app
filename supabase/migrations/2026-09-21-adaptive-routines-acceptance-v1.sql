-- P1.2 Adaptive routines V1
-- Atomic acceptance of an adaptive routine suggestion.

create or replace function public.accept_routine_adaptation(
  p_routine_id uuid,
  p_suggested_frequency text,
  p_suggested_custom_days integer[],
  p_suggested_anchor_weekday integer,
  p_new_due_date date
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_household_id uuid;
  v_pending_task_id uuid;
  v_current_due_date date;
  v_expected_due_date date;
  v_current_weekday integer;
  v_forward_days integer;
begin
  if p_suggested_frequency not in ('weekly', 'biweekly', 'custom') then
    raise exception 'Unsupported adaptive frequency';
  end if;

  if p_suggested_anchor_weekday is null
     or p_suggested_anchor_weekday < 0
     or p_suggested_anchor_weekday > 6 then
    raise exception 'Invalid adaptive weekday';
  end if;

  if p_suggested_frequency = 'custom' then
    if p_suggested_custom_days is null
       or cardinality(p_suggested_custom_days) <> 1
       or p_suggested_custom_days[1] <> p_suggested_anchor_weekday then
      raise exception 'Adaptive custom recurrence requires exactly the suggested weekday';
    end if;
  elsif p_suggested_custom_days is not null
        and cardinality(p_suggested_custom_days) > 0 then
    raise exception 'Custom days are only allowed for custom recurrence';
  end if;

  select r.household_id
    into v_household_id
  from public.routines r
  where r.id = p_routine_id
    and r.active = true
  for update;

  if v_household_id is null then
    raise exception 'Routine not found';
  end if;

  if not exists (
    select 1
    from public.members m
    where m.household_id = v_household_id
      and m.user_id = auth.uid()
      and m.left_at is null
  ) then
    raise exception 'Not authorized';
  end if;

  select t.id, t.due_date
    into v_pending_task_id, v_current_due_date
  from public.tasks t
  where t.routine_id = p_routine_id
    and t.household_id = v_household_id
    and t.status = 'pending'
    and t.due_date is not null
  order by t.due_date asc, t.created_at asc
  limit 1
  for update;

  if v_pending_task_id is null then
    raise exception 'No pending occurrence found';
  end if;

  -- PostgreSQL extract(dow): Sunday=0 ... Saturday=6.
  v_current_weekday := extract(dow from v_current_due_date)::integer;
  v_forward_days := (p_suggested_anchor_weekday - v_current_weekday + 7) % 7;
  v_expected_due_date := v_current_due_date + v_forward_days;

  if p_new_due_date is distinct from v_expected_due_date then
    raise exception 'Invalid adaptive due date';
  end if;

  update public.routines
  set
    frequency = p_suggested_frequency,
    custom_days = case
      when p_suggested_frequency = 'custom'
        then array[p_suggested_anchor_weekday]
      else null
    end,
    anchor_date = v_expected_due_date
  where id = p_routine_id;

  update public.tasks
  set due_date = v_expected_due_date
  where id = v_pending_task_id;

  insert into public.routine_adaptation_preferences (
    household_id,
    routine_id,
    suggested_frequency,
    suggested_custom_days,
    suggested_anchor_weekday,
    status,
    snoozed_until,
    responded_at,
    updated_at
  )
  values (
    v_household_id,
    p_routine_id,
    p_suggested_frequency,
    case
      when p_suggested_frequency = 'custom'
        then array[p_suggested_anchor_weekday]
      else null
    end,
    p_suggested_anchor_weekday,
    'accepted',
    null,
    now(),
    now()
  )
  on conflict (
    routine_id,
    suggested_frequency,
    coalesce(suggested_custom_days, array[]::integer[]),
    coalesce(suggested_anchor_weekday, -1)
  )
  do update set
    status = 'accepted',
    snoozed_until = null,
    responded_at = now(),
    updated_at = now();

end;
$$;

revoke all on function public.accept_routine_adaptation(uuid, text, integer[], integer, date)
  from public;

grant execute on function public.accept_routine_adaptation(uuid, text, integer[], integer, date)
  to authenticated;
