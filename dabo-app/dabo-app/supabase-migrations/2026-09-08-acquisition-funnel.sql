-- DABO — Funnel d'acquisition attribué
-- À exécuter UNE SEULE FOIS dans Supabase SQL Editor.

begin;

alter table public.app_share_events
  add column if not exists referral_token uuid;

create unique index if not exists app_share_events_referral_token_uidx
  on public.app_share_events(referral_token)
  where referral_token is not null;

create table if not exists public.acquisition_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (event_name in ('landing_view','app_open','signup_completed','household_created','household_joined','first_value')),
  visitor_id uuid not null,
  referral_token uuid null,
  user_id uuid null references auth.users(id) on delete set null,
  household_id uuid null references public.households(id) on delete set null,
  value_type text null check (value_type is null or value_type in ('task','shopping','calendar')),
  created_at timestamptz not null default now()
);

create index if not exists acquisition_events_created_at_idx on public.acquisition_events(created_at desc);
create index if not exists acquisition_events_visitor_idx on public.acquisition_events(visitor_id, created_at);
create index if not exists acquisition_events_referral_idx on public.acquisition_events(referral_token, created_at) where referral_token is not null;
create index if not exists acquisition_events_user_idx on public.acquisition_events(user_id, created_at) where user_id is not null;

alter table public.acquisition_events enable row level security;
-- Aucune policy navigateur : les écritures/lectures passent par les routes serveur DABO.

commit;
