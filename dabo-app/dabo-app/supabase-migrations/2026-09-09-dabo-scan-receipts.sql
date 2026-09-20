-- DABO Scan V2.1 — tickets de caisse et historique d'achats.
-- Migration ciblée et idempotente. Ne pas exécuter supabase-schema.sql en production.

begin;

create table if not exists public.shopping_receipts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by_member_id uuid not null references public.members(id) on delete restrict,
  shopper_member_id uuid not null references public.members(id) on delete restrict,
  merchant text,
  purchase_date date,
  total_amount numeric(12,2),
  currency text not null default 'EUR',
  raw_text text,
  created_at timestamptz not null default now()
);

alter table public.shopping_items add column if not exists receipt_id uuid references public.shopping_receipts(id) on delete set null;
alter table public.shopping_items add column if not exists unit_price numeric(12,2);
alter table public.shopping_items add column if not exists bought_by_member_id uuid references public.members(id) on delete set null;

create index if not exists shopping_receipts_household_created_idx on public.shopping_receipts(household_id, created_at desc);
create index if not exists shopping_items_receipt_idx on public.shopping_items(receipt_id);

alter table public.shopping_receipts enable row level security;

drop policy if exists "shopping_receipts_select" on public.shopping_receipts;
drop policy if exists "shopping_receipts_insert" on public.shopping_receipts;
drop policy if exists "shopping_receipts_update" on public.shopping_receipts;
drop policy if exists "shopping_receipts_delete" on public.shopping_receipts;

create policy "shopping_receipts_select" on public.shopping_receipts for select to authenticated
using (public.is_active_household_member(household_id));

create policy "shopping_receipts_insert" on public.shopping_receipts for insert to authenticated
with check (
  public.is_active_household_member(household_id)
  and exists (select 1 from public.members m where m.id = created_by_member_id and m.household_id = shopping_receipts.household_id and m.user_id = auth.uid() and m.left_at is null)
  and exists (select 1 from public.members m where m.id = shopper_member_id and m.household_id = shopping_receipts.household_id and m.left_at is null)
);

create policy "shopping_receipts_update" on public.shopping_receipts for update to authenticated
using (public.is_active_household_member(household_id))
with check (public.is_active_household_member(household_id));

create policy "shopping_receipts_delete" on public.shopping_receipts for delete to authenticated
using (public.is_active_household_member(household_id));

grant select, insert, update, delete on public.shopping_receipts to authenticated;

commit;
