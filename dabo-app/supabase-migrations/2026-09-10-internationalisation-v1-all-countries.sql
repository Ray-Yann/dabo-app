-- DABO Internationalisation V1 — tous les pays ISO
-- Étend Courses V2.2 sans toucher aux données existantes.

alter table public.global_stores
  drop constraint if exists global_stores_country_code_check;
alter table public.global_stores
  add constraint global_stores_country_code_check
  check (country_code ~ '^[A-Z]{2}$');

alter table public.households
  drop constraint if exists households_country_code_check;
alter table public.households
  add constraint households_country_code_check
  check (country_code ~ '^[A-Z]{2}$');

comment on column public.households.country_code is
  'Code pays ISO 3166-1 alpha-2 du foyer, utilisé pour contextualiser les propositions locales.';
comment on column public.global_stores.country_code is
  'Code pays ISO 3166-1 alpha-2 du catalogue magasin partagé.';
