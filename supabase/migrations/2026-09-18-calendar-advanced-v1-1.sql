-- DABO — Calendrier avancé V1.1
-- Fuseau horaire + anti-doublon persistant des rappels calendrier

alter table public.calendar_events
  add column if not exists time_zone text;

update public.calendar_events
set time_zone = 'Europe/Brussels'
where time_zone is null;

alter table public.calendar_events
  alter column time_zone set default 'Europe/Brussels';

create table if not exists public.calendar_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  occurrence_date date not null,
  reminder_days_before integer not null default 0,
  created_at timestamptz not null default now(),

  constraint calendar_reminder_deliveries_unique
    unique (
      event_id,
      member_id,
      occurrence_date,
      reminder_days_before
    )
);

create index if not exists calendar_reminder_deliveries_event_idx
  on public.calendar_reminder_deliveries(event_id);

create index if not exists calendar_reminder_deliveries_member_idx
  on public.calendar_reminder_deliveries(member_id);

alter table public.calendar_reminder_deliveries enable row level security;

comment on table public.calendar_reminder_deliveries is
  'Verrou persistant empêchant l envoi multiple du même rappel calendrier pour une occurrence et un membre.';
