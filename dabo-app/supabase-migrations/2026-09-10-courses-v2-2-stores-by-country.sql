-- DABO Courses V2.2 — catalogue de magasins contextualisé par pays
-- Migration idempotente. Ne pas rejouer supabase-schema.sql.

alter table public.households
  add column if not exists country_code text;

update public.households
set country_code = 'BE'
where country_code is null;

alter table public.households
  alter column country_code set default 'BE';

alter table public.households
  alter column country_code set not null;

alter table public.global_stores
  add column if not exists country_code text;

-- DABO est actuellement lancé depuis la Belgique : les entrées historiques V2.1
-- sont conservées dans le catalogue belge. Les prochains ajouts portent leur pays explicitement.
update public.global_stores
set country_code = 'BE'
where country_code is null;

alter table public.global_stores
  alter column country_code set default 'BE';

alter table public.global_stores
  alter column country_code set not null;

drop index if exists public.global_stores_name_ci_uidx;
create unique index if not exists global_stores_country_name_ci_uidx
  on public.global_stores (country_code, lower(trim(name)));

alter table public.global_stores
  drop constraint if exists global_stores_country_code_check;
alter table public.global_stores
  add constraint global_stores_country_code_check
  check (country_code in ('BE','FR','NL','GB'));

alter table public.households
  drop constraint if exists households_country_code_check;
alter table public.households
  add constraint households_country_code_check
  check (country_code in ('BE','FR','NL','GB'));

-- Catalogues de départ par pays. Les magasins appris enrichissent ensuite le pays du foyer.
insert into public.global_stores (name, country_code) values
  ('Carrefour','BE'), ('Colruyt','BE'), ('Lidl','BE'), ('Aldi','BE'), ('Delhaize','BE'), ('Action','BE'), ('Albert Heijn','BE'), ('Intermarché','BE'),
  ('Carrefour','FR'), ('E.Leclerc','FR'), ('Intermarché','FR'), ('Lidl','FR'), ('Aldi','FR'), ('Auchan','FR'), ('Monoprix','FR'), ('Action','FR'),
  ('Albert Heijn','NL'), ('Jumbo','NL'), ('Lidl','NL'), ('Aldi','NL'), ('PLUS','NL'), ('Dirk','NL'), ('Action','NL'),
  ('Tesco','GB'), ('Sainsbury''s','GB'), ('Asda','GB'), ('Morrisons','GB'), ('Aldi','GB'), ('Lidl','GB'), ('Waitrose','GB'), ('Iceland','GB')
on conflict do nothing;

comment on column public.households.country_code is
  'Pays du foyer utilisé pour contextualiser les propositions locales, modifiable dans Réglages.';
comment on column public.global_stores.country_code is
  'Pays dans lequel ce nom de magasin est proposé. Aucune donnée de foyer ou d achat n est stockée ici.';
