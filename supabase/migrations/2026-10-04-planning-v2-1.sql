-- DABO Planning V2.1 — planification réelle + responsabilités liées aux événements

alter table public.calendar_events
  add column if not exists end_time time;

create table if not exists public.planning_task_slots (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  occurrence_date date not null,
  start_time time not null,
  end_time time,
  created_by uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, occurrence_date)
);

create index if not exists planning_task_slots_household_date_idx
  on public.planning_task_slots (household_id, occurrence_date, start_time);

alter table public.planning_task_slots enable row level security;

drop policy if exists "planning_task_slots_select" on public.planning_task_slots;
create policy "planning_task_slots_select"
on public.planning_task_slots for select to authenticated
using (household_id in (select household_id from public.members where user_id = auth.uid() and left_at is null));

drop policy if exists "planning_task_slots_insert" on public.planning_task_slots;
create policy "planning_task_slots_insert"
on public.planning_task_slots for insert to authenticated
with check (
  household_id in (select household_id from public.members where user_id = auth.uid() and left_at is null)
  and created_by in (select id from public.members where user_id = auth.uid() and household_id = planning_task_slots.household_id and left_at is null)
);

drop policy if exists "planning_task_slots_update" on public.planning_task_slots;
create policy "planning_task_slots_update"
on public.planning_task_slots for update to authenticated
using (household_id in (select household_id from public.members where user_id = auth.uid() and left_at is null))
with check (household_id in (select household_id from public.members where user_id = auth.uid() and left_at is null));

drop policy if exists "planning_task_slots_delete" on public.planning_task_slots;
create policy "planning_task_slots_delete"
on public.planning_task_slots for delete to authenticated
using (household_id in (select household_id from public.members where user_id = auth.uid() and left_at is null));

create table if not exists public.calendar_event_responsibilities (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 160),
  responsibility_kind text not null default 'preparation' check (responsibility_kind in ('preparation','transport','decision')),
  assigned_to uuid references public.members(id) on delete set null,
  due_date date,
  due_time time,
  status text not null default 'pending' check (status in ('pending','done')),
  created_by uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_event_responsibilities_event_idx
  on public.calendar_event_responsibilities (event_id, status, due_date, due_time);
create index if not exists calendar_event_responsibilities_household_idx
  on public.calendar_event_responsibilities (household_id, assigned_to, status);

alter table public.calendar_event_responsibilities enable row level security;

drop policy if exists "calendar_event_responsibilities_select" on public.calendar_event_responsibilities;
create policy "calendar_event_responsibilities_select"
on public.calendar_event_responsibilities for select to authenticated
using (
  exists (
    select 1 from public.calendar_events e
    where e.id = calendar_event_responsibilities.event_id
      and e.household_id = calendar_event_responsibilities.household_id
      and e.household_id in (select household_id from public.members where user_id = auth.uid() and left_at is null)
      and (e.visibility = 'household' or e.private_owner_id in (select id from public.members where user_id = auth.uid() and left_at is null))
  )
);

drop policy if exists "calendar_event_responsibilities_insert" on public.calendar_event_responsibilities;
create policy "calendar_event_responsibilities_insert"
on public.calendar_event_responsibilities for insert to authenticated
with check (
  created_by in (select id from public.members where user_id = auth.uid() and household_id = calendar_event_responsibilities.household_id and left_at is null)
  and exists (
    select 1 from public.calendar_events e
    where e.id = calendar_event_responsibilities.event_id
      and e.household_id = calendar_event_responsibilities.household_id
      and (e.visibility = 'household' or e.private_owner_id = calendar_event_responsibilities.created_by)
  )
);

drop policy if exists "calendar_event_responsibilities_update" on public.calendar_event_responsibilities;
create policy "calendar_event_responsibilities_update"
on public.calendar_event_responsibilities for update to authenticated
using (household_id in (select household_id from public.members where user_id = auth.uid() and left_at is null))
with check (household_id in (select household_id from public.members where user_id = auth.uid() and left_at is null));

drop policy if exists "calendar_event_responsibilities_delete" on public.calendar_event_responsibilities;
create policy "calendar_event_responsibilities_delete"
on public.calendar_event_responsibilities for delete to authenticated
using (household_id in (select household_id from public.members where user_id = auth.uid() and left_at is null));

grant select, insert, update, delete on public.planning_task_slots to authenticated;
grant select, insert, update, delete on public.calendar_event_responsibilities to authenticated;
