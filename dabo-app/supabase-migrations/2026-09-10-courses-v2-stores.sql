-- DABO Courses V2 — magasins du foyer
-- Migration idempotente. Ne pas rejouer supabase-schema.sql.

create table if not exists public.household_stores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint household_stores_name_not_blank check (length(trim(name)) > 0)
);

create unique index if not exists household_stores_household_name_ci_uidx
  on public.household_stores (household_id, lower(trim(name)));

alter table public.household_stores enable row level security;

drop policy if exists "Voir les magasins du foyer" on public.household_stores;
create policy "Voir les magasins du foyer"
on public.household_stores for select to authenticated
using (public.is_active_household_member(household_id));

drop policy if exists "Ajouter les magasins du foyer" on public.household_stores;
create policy "Ajouter les magasins du foyer"
on public.household_stores for insert to authenticated
with check (public.is_active_household_member(household_id));

drop policy if exists "Modifier les magasins du foyer" on public.household_stores;
create policy "Modifier les magasins du foyer"
on public.household_stores for update to authenticated
using (public.is_active_household_member(household_id))
with check (public.is_active_household_member(household_id));

drop policy if exists "Supprimer les magasins du foyer" on public.household_stores;
create policy "Supprimer les magasins du foyer"
on public.household_stores for delete to authenticated
using (public.is_active_household_member(household_id));

grant select, insert, update, delete on public.household_stores to authenticated;

alter table public.shopping_items
  add column if not exists store_name text null;

comment on column public.shopping_items.store_name is
  'Nom du magasin choisi au moment de la course. Texte conservé pour garder l’historique même si la liste de magasins évolue.';
