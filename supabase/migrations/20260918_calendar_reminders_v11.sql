-- DABO — Calendrier avancé V1.1 : rappels horaires fiables
alter table public.calendar_events
  add column if not exists time_zone text;

update public.calendar_events
set time_zone = 'Europe/Brussels'
where time_zone is null and event_time is not null;

create table if not exists public.calendar_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  occurrence_date date not null,
  reminder_days_before integer not null default 0,
  delivered_at timestamptz not null default now(),
  unique(event_id, member_id, occurrence_date, reminder_days_before)
);

alter table public.calendar_reminder_deliveries enable row level security;
revoke all on table public.calendar_reminder_deliveries from anon, authenticated;
