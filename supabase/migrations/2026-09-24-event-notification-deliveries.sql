-- DABO event notifications — persistent per-recipient delivery claims
-- Prevents concurrent or replayed requests from sending the same event twice
-- to the same household member.

create table if not exists public.event_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  member_id uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_key, member_id)
);

create index if not exists event_notification_deliveries_member_idx
  on public.event_notification_deliveries(member_id, created_at desc);

alter table public.event_notification_deliveries enable row level security;

-- Technical table: clients receive no direct policy.
-- The notification API uses the service role and only needs to claim a
-- delivery before sending, or release it when nothing could be delivered.
grant insert, delete
on table public.event_notification_deliveries
to service_role;
