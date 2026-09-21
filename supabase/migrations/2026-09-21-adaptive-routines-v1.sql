create table if not exists public.routine_adaptation_preferences (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  routine_id uuid not null references public.routines(id) on delete cascade,

  suggested_frequency text not null,
  suggested_custom_days integer[],
  suggested_anchor_weekday integer,

  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'dismissed', 'snoozed')),

  snoozed_until timestamptz,
  suggested_at timestamptz not null default now(),
  responded_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint routine_adaptation_preferences_weekday_check
    check (
      suggested_anchor_weekday is null
      or suggested_anchor_weekday between 0 and 6
    ),

  constraint routine_adaptation_preferences_frequency_check
    check (
      suggested_frequency in (
        'daily',
        'weekly',
        'biweekly',
        'monthly',
        'yearly',
        'custom'
      )
    ),

  constraint routine_adaptation_preferences_custom_days_check
    check (
      suggested_custom_days is null
      or suggested_custom_days <@ array[0,1,2,3,4,5,6]
    )
);

create unique index if not exists routine_adaptation_preferences_unique_idx
  on public.routine_adaptation_preferences (
    routine_id,
    suggested_frequency,
    coalesce(suggested_custom_days, array[]::integer[]),
    coalesce(suggested_anchor_weekday, -1)
  );

create index if not exists routine_adaptation_preferences_household_idx
  on public.routine_adaptation_preferences (household_id);

create index if not exists routine_adaptation_preferences_routine_idx
  on public.routine_adaptation_preferences (routine_id);

alter table public.routine_adaptation_preferences enable row level security;

create policy "Household members can view routine adaptation preferences"
  on public.routine_adaptation_preferences
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.members m
      where m.household_id = routine_adaptation_preferences.household_id
        and m.user_id = auth.uid()
        and m.left_at is null
    )
  );

create policy "Household members can create routine adaptation preferences"
  on public.routine_adaptation_preferences
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.members m
      where m.household_id = routine_adaptation_preferences.household_id
        and m.user_id = auth.uid()
        and m.left_at is null
    )
    and exists (
      select 1
      from public.routines r
      where r.id = routine_adaptation_preferences.routine_id
        and r.household_id = routine_adaptation_preferences.household_id
    )
  );

create policy "Household members can update routine adaptation preferences"
  on public.routine_adaptation_preferences
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.members m
      where m.household_id = routine_adaptation_preferences.household_id
        and m.user_id = auth.uid()
        and m.left_at is null
    )
  )
  with check (
    exists (
      select 1
      from public.members m
      where m.household_id = routine_adaptation_preferences.household_id
        and m.user_id = auth.uid()
        and m.left_at is null
    )
    and exists (
      select 1
      from public.routines r
      where r.id = routine_adaptation_preferences.routine_id
        and r.household_id = routine_adaptation_preferences.household_id
    )
  );
