-- DABO V2 — Sous-tâches V1
create table if not exists public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 200),
  assigned_to uuid references public.members(id) on delete set null,
  position integer not null default 0 check (position >= 0),
  completed_at timestamptz,
  completed_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint task_subtasks_completion_pair check (
    (completed_at is null and completed_by is null) or
    (completed_at is not null and completed_by is not null)
  )
);

create index if not exists task_subtasks_task_position_idx on public.task_subtasks(task_id, position);
create index if not exists task_subtasks_household_assignee_idx on public.task_subtasks(household_id, assigned_to);

alter table public.task_subtasks enable row level security;

drop policy if exists "Household members can view task subtasks" on public.task_subtasks;
create policy "Household members can view task subtasks" on public.task_subtasks
for select to authenticated
using (exists (
  select 1 from public.members m
  where m.household_id = task_subtasks.household_id
    and m.user_id = auth.uid()
    and m.left_at is null
));

drop policy if exists "Household members can create task subtasks" on public.task_subtasks;
create policy "Household members can create task subtasks" on public.task_subtasks
for insert to authenticated
with check (
  exists (select 1 from public.members m where m.household_id = task_subtasks.household_id and m.user_id = auth.uid() and m.left_at is null)
  and exists (select 1 from public.tasks t where t.id = task_subtasks.task_id and t.household_id = task_subtasks.household_id)
  and (task_subtasks.assigned_to is null or exists (select 1 from public.members a where a.id = task_subtasks.assigned_to and a.household_id = task_subtasks.household_id and a.left_at is null))
  and (task_subtasks.completed_by is null or exists (select 1 from public.members c where c.id = task_subtasks.completed_by and c.household_id = task_subtasks.household_id and c.left_at is null))
);

drop policy if exists "Household members can update task subtasks" on public.task_subtasks;
create policy "Household members can update task subtasks" on public.task_subtasks
for update to authenticated
using (exists (
  select 1 from public.members m
  where m.household_id = task_subtasks.household_id and m.user_id = auth.uid() and m.left_at is null
))
with check (
  exists (select 1 from public.members m where m.household_id = task_subtasks.household_id and m.user_id = auth.uid() and m.left_at is null)
  and exists (select 1 from public.tasks t where t.id = task_subtasks.task_id and t.household_id = task_subtasks.household_id)
  and (task_subtasks.assigned_to is null or exists (select 1 from public.members a where a.id = task_subtasks.assigned_to and a.household_id = task_subtasks.household_id and a.left_at is null))
  and (task_subtasks.completed_by is null or exists (select 1 from public.members c where c.id = task_subtasks.completed_by and c.household_id = task_subtasks.household_id and c.left_at is null))
);

drop policy if exists "Household members can delete task subtasks" on public.task_subtasks;
create policy "Household members can delete task subtasks" on public.task_subtasks
for delete to authenticated
using (exists (
  select 1 from public.members m
  where m.household_id = task_subtasks.household_id and m.user_id = auth.uid() and m.left_at is null
));
