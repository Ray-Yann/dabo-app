-- DABO Courses V2.1 — catalogue global de magasins
-- Migration idempotente. Ne pas rejouer supabase-schema.sql.
-- Seul le nom du magasin est partagé entre foyers. Aucune donnée de course ou de foyer n'est exposée.

create table if not exists public.global_stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  constraint global_stores_name_not_blank check (length(trim(name)) > 0)
);

create unique index if not exists global_stores_name_ci_uidx
  on public.global_stores (lower(trim(name)));

alter table public.global_stores enable row level security;

drop policy if exists "Voir le catalogue global des magasins" on public.global_stores;
create policy "Voir le catalogue global des magasins"
on public.global_stores for select to authenticated
using (true);

drop policy if exists "Enrichir le catalogue global des magasins" on public.global_stores;
create policy "Enrichir le catalogue global des magasins"
on public.global_stores for insert to authenticated
with check (length(trim(name)) > 0 and length(trim(name)) <= 120);

grant select, insert on public.global_stores to authenticated;

-- Base commune DABO.
insert into public.global_stores (name)
values
  ('Carrefour'), ('Colruyt'), ('Lidl'), ('Aldi'), ('Delhaize'), ('Action'), ('Albert Heijn'), ('Intermarché')
on conflict do nothing;

-- Les magasins déjà appris par les foyers enrichissent immédiatement le catalogue commun.
insert into public.global_stores (name)
select distinct trim(hs.name)
from public.household_stores hs
where length(trim(hs.name)) > 0
on conflict do nothing;

comment on table public.global_stores is
  'Catalogue partagé de noms de magasins DABO. Ne contient aucune donnée d achat ni identifiant de foyer.';
