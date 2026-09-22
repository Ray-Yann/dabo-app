-- DABO P4.2 — Discovery & Product Preview
-- Étend le funnel d'acquisition existant sans créer un second système analytics.

do $$
declare
  constraint_name text;
begin
  select c.conname
    into constraint_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'acquisition_events'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) like '%event_name%'
  limit 1;

  if constraint_name is not null then
    execute format(
      'alter table public.acquisition_events drop constraint %I',
      constraint_name
    );
  end if;
end $$;

alter table public.acquisition_events
  add constraint acquisition_events_event_name_check
  check (
    event_name in (
      'landing_view',
      'product_preview_viewed',
      'product_preview_engaged',
      'app_open',
      'signup_completed',
      'household_created',
      'household_joined',
      'first_value'
    )
  );
