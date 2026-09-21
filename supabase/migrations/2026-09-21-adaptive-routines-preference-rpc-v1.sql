create or replace function public.save_routine_adaptation_preference(
  p_household_id uuid,
  p_routine_id uuid,
  p_suggested_frequency text,
  p_suggested_custom_days integer[],
  p_suggested_anchor_weekday integer,
  p_status text,
  p_snoozed_until timestamptz
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_household_id uuid;
begin
  if p_status not in ('dismissed', 'snoozed') then
    raise exception 'Invalid adaptation preference status';
  end if;

  if p_suggested_frequency not in (
    'daily',
    'weekly',
    'biweekly',
    'monthly',
    'yearly',
    'custom'
  ) then
    raise exception 'Invalid suggested frequency';
  end if;

  if p_suggested_anchor_weekday is null
     or p_suggested_anchor_weekday < 0
     or p_suggested_anchor_weekday > 6 then
    raise exception 'Invalid suggested anchor weekday';
  end if;

  if p_status = 'snoozed' and p_snoozed_until is null then
    raise exception 'Snoozed preference requires snoozed_until';
  end if;

  if p_status = 'dismissed' and p_snoozed_until is not null then
    raise exception 'Dismissed preference cannot have snoozed_until';
  end if;

  select r.household_id
  into v_household_id
  from public.routines r
  where r.id = p_routine_id
  for update;

  if v_household_id is null or v_household_id <> p_household_id then
    raise exception 'Routine does not belong to household';
  end if;

  if not exists (
    select 1
    from public.members m
    where m.household_id = v_household_id
      and m.user_id = auth.uid()
      and m.left_at is null
  ) then
    raise exception 'Not an active household member';
  end if;

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
    p_household_id,
    p_routine_id,
    p_suggested_frequency,
    p_suggested_custom_days,
    p_suggested_anchor_weekday,
    p_status,
    p_snoozed_until,
    now(),
    now()
  )
  on conflict (
    routine_id,
    suggested_frequency,
    (coalesce(suggested_custom_days, array[]::integer[])),
    (coalesce(suggested_anchor_weekday, -1))
  )
  do update set
    status = excluded.status,
    snoozed_until = excluded.snoozed_until,
    responded_at = now(),
    updated_at = now();

end;
$$;

revoke all on function public.save_routine_adaptation_preference(
  uuid,
  uuid,
  text,
  integer[],
  integer,
  text,
  timestamptz
) from public;

grant execute on function public.save_routine_adaptation_preference(
  uuid,
  uuid,
  text,
  integer[],
  integer,
  text,
  timestamptz
) to authenticated;
