-- DABO — mesure de « Faire connaître DABO »
-- À exécuter une seule fois dans Supabase SQL Editor avant de déployer le code.
create table if not exists public.app_share_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid null references public.households(id) on delete set null,
  method text not null check (method in ('native', 'clipboard')),
  created_at timestamptz not null default now()
);

create index if not exists app_share_events_created_at_idx on public.app_share_events(created_at desc);
create index if not exists app_share_events_user_id_idx on public.app_share_events(user_id);

alter table public.app_share_events enable row level security;
-- Aucun accès direct depuis le navigateur : les écritures passent par /api/share-app
-- après validation du jeton utilisateur. Le cockpit utilise le client serveur admin.
