-- DABO — Calendrier personnel réellement privé
-- À exécuter une fois dans Supabase > SQL Editor avant le déploiement du code.

alter table public.calendar_events
  add column if not exists visibility text not null default 'household',
  add column if not exists private_owner_id uuid references public.members(id) on delete cascade;

update public.calendar_events
set visibility = 'household', private_owner_id = null
where visibility is null or visibility not in ('household', 'personal');

alter table public.calendar_events
  drop constraint if exists calendar_events_visibility_check,
  drop constraint if exists calendar_events_personal_owner_check;

alter table public.calendar_events
  add constraint calendar_events_visibility_check
    check (visibility in ('household', 'personal')),
  add constraint calendar_events_personal_owner_check
    check (
      (visibility = 'household' and private_owner_id is null)
      or
      (visibility = 'personal' and private_owner_id is not null)
    );

create index if not exists calendar_events_household_visibility_idx
  on public.calendar_events (household_id, visibility, event_date);

create index if not exists calendar_events_private_owner_idx
  on public.calendar_events (private_owner_id, event_date)
  where visibility = 'personal';

alter table public.calendar_events enable row level security;

-- Remplace les anciennes règles du calendrier afin qu'aucune ancienne règle
-- trop large ne puisse exposer un événement personnel.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'calendar_events'
  loop
    execute format('drop policy if exists %I on public.calendar_events', policy_row.policyname);
  end loop;
end $$;

create policy "Calendrier - lecture autorisee"
on public.calendar_events for select
using (
  household_id in (
    select household_id from public.members
    where user_id = auth.uid() and left_at is null
  )
  and (
    visibility = 'household'
    or private_owner_id in (
      select id from public.members
      where user_id = auth.uid() and left_at is null
    )
  )
);

create policy "Calendrier - creation autorisee"
on public.calendar_events for insert
with check (
  household_id in (
    select household_id from public.members
    where user_id = auth.uid() and left_at is null
  )
  and (
    (visibility = 'household' and private_owner_id is null)
    or
    (visibility = 'personal' and private_owner_id in (
      select id from public.members
      where user_id = auth.uid()
        and household_id = calendar_events.household_id
        and left_at is null
    ))
  )
);

create policy "Calendrier - modification autorisee"
on public.calendar_events for update
using (
  household_id in (
    select household_id from public.members
    where user_id = auth.uid() and left_at is null
  )
  and (
    visibility = 'household'
    or private_owner_id in (
      select id from public.members
      where user_id = auth.uid() and left_at is null
    )
  )
)
with check (
  household_id in (
    select household_id from public.members
    where user_id = auth.uid() and left_at is null
  )
  and (
    (visibility = 'household' and private_owner_id is null)
    or
    (visibility = 'personal' and private_owner_id in (
      select id from public.members
      where user_id = auth.uid()
        and household_id = calendar_events.household_id
        and left_at is null
    ))
  )
);

create policy "Calendrier - suppression autorisee"
on public.calendar_events for delete
using (
  household_id in (
    select household_id from public.members
    where user_id = auth.uid() and left_at is null
  )
  and (
    visibility = 'household'
    or private_owner_id in (
      select id from public.members
      where user_id = auth.uid() and left_at is null
    )
  )
);
