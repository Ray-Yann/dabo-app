-- DABO V2 — Suggestions intelligentes V1.2
-- Mémoire explicite des suggestions acceptées + attribution atomique.

create table if not exists public.household_action_suggestions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  task_id uuid not null,
  suggested_member_id uuid not null references public.members(id) on delete cascade,
  previous_assigned_to uuid references public.members(id) on delete set null,
  reason text not null default 'rebalance' check (reason in ('rebalance')),
  accepted_at timestamptz not null default now(),
  constraint household_action_suggestions_task_household_fkey
    foreign key (task_id, household_id) references public.tasks(id, household_id) on delete cascade
);

create index if not exists household_action_suggestions_household_accepted_idx
  on public.household_action_suggestions (household_id, accepted_at desc);
create index if not exists household_action_suggestions_task_idx
  on public.household_action_suggestions (task_id);

alter table public.household_action_suggestions enable row level security;

drop policy if exists "Household members can view accepted suggestions" on public.household_action_suggestions;
create policy "Household members can view accepted suggestions"
on public.household_action_suggestions for select to authenticated
using (exists (
  select 1 from public.members m
  where m.household_id = household_action_suggestions.household_id
    and m.user_id = auth.uid()
    and m.left_at is null
));

-- Les insertions directes restent interdites : seule la fonction transactionnelle ci-dessous écrit.
revoke insert, update, delete on public.household_action_suggestions from anon, authenticated;
grant select on public.household_action_suggestions to authenticated;

create or replace function public.accept_household_action_suggestion(
  p_household_id uuid,
  p_task_id uuid,
  p_suggested_member_id uuid,
  p_reason text default 'rebalance'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous uuid;
  v_action_id uuid;
begin
  if p_reason <> 'rebalance' then
    raise exception 'unsupported suggestion reason';
  end if;

  if not exists (
    select 1 from public.members m
    where m.household_id = p_household_id
      and m.user_id = auth.uid()
      and m.left_at is null
  ) then
    raise exception 'household access denied';
  end if;

  if not exists (
    select 1 from public.members m
    where m.id = p_suggested_member_id
      and m.household_id = p_household_id
      and m.left_at is null
  ) then
    raise exception 'suggested member is not active in household';
  end if;

  select t.assigned_to into v_previous
  from public.tasks t
  where t.id = p_task_id
    and t.household_id = p_household_id
    and t.status = 'pending'
  for update;

  if not found then
    raise exception 'pending task not found in household';
  end if;

  update public.tasks
  set assigned_to = p_suggested_member_id
  where id = p_task_id and household_id = p_household_id and status = 'pending';

  insert into public.household_action_suggestions (
    household_id, task_id, suggested_member_id, previous_assigned_to, reason
  ) values (
    p_household_id, p_task_id, p_suggested_member_id, v_previous, p_reason
  ) returning id into v_action_id;

  return v_action_id;
end;
$$;

revoke all on function public.accept_household_action_suggestion(uuid, uuid, uuid, text) from public;
grant execute on function public.accept_household_action_suggestion(uuid, uuid, uuid, text) to authenticated;
