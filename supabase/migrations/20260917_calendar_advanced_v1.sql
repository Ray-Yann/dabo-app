-- DABO — Calendrier avancé V1
alter table public.calendar_events
  add column if not exists recurrence_frequency text not null default 'none',
  add column if not exists recurrence_interval integer not null default 1,
  add column if not exists recurrence_end_date date,
  add column if not exists event_time time,
  add column if not exists all_day boolean not null default true,
  add column if not exists notes text,
  add column if not exists event_kind text not null default 'event';

-- Les anciens événements récurrents DABO étaient annuels.
update public.calendar_events set recurrence_frequency='yearly', recurrence_interval=1 where recurring=true and recurrence_frequency='none';

alter table public.calendar_events drop constraint if exists calendar_events_recurrence_frequency_check;
alter table public.calendar_events add constraint calendar_events_recurrence_frequency_check check (recurrence_frequency in ('none','daily','weekly','monthly','yearly'));
alter table public.calendar_events drop constraint if exists calendar_events_recurrence_interval_check;
alter table public.calendar_events add constraint calendar_events_recurrence_interval_check check (recurrence_interval between 1 and 999);
alter table public.calendar_events drop constraint if exists calendar_events_kind_check;
alter table public.calendar_events add constraint calendar_events_kind_check check (event_kind in ('event','reminder'));
