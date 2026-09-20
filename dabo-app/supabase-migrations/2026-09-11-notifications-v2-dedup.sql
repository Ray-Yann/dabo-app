-- DABO Notifications V2 — déduplication logique des digests quotidiens
create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  delivery_date date not null,
  digest_key text not null,
  created_at timestamptz not null default now(),
  unique (member_id, delivery_date)
);

create index if not exists notification_deliveries_member_date_idx
  on public.notification_deliveries(member_id, delivery_date desc);

alter table public.notification_deliveries enable row level security;
-- Aucune policy client : cette table technique n'est utilisée que par le Cron service-role.
