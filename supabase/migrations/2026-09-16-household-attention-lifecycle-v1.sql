-- DABO V2 — Cycle de vie des repères V1
-- Persists only that a household intelligence signal was consulted.
-- The signal itself remains deterministic and is recomputed from confirmed data.

create table if not exists public.household_attention_receipts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  signal_key text not null,
  fingerprint text not null,
  viewed_at timestamptz not null default now(),
  snoozed_until timestamptz not null,
  updated_at timestamptz not null default now(),
  unique (household_id, user_id, signal_key)
);

create index if not exists household_attention_receipts_household_user_idx
  on public.household_attention_receipts (household_id, user_id);

alter table public.household_attention_receipts enable row level security;

drop policy if exists "household_attention_receipts_select_own" on public.household_attention_receipts;
create policy "household_attention_receipts_select_own"
on public.household_attention_receipts
for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.members m
    where m.household_id = household_attention_receipts.household_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "household_attention_receipts_insert_own" on public.household_attention_receipts;
create policy "household_attention_receipts_insert_own"
on public.household_attention_receipts
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.members m
    where m.household_id = household_attention_receipts.household_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "household_attention_receipts_update_own" on public.household_attention_receipts;
create policy "household_attention_receipts_update_own"
on public.household_attention_receipts
for update
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.members m
    where m.household_id = household_attention_receipts.household_id
      and m.user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.members m
    where m.household_id = household_attention_receipts.household_id
      and m.user_id = auth.uid()
  )
);

grant select, insert, update on public.household_attention_receipts to authenticated;
revoke all on public.household_attention_receipts from anon;
