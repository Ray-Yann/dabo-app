begin;

alter table public.members
  drop constraint if exists members_language_check;

alter table public.members
  add constraint members_language_check
  check (language = any (array['fr'::text, 'nl'::text, 'en'::text, 'de'::text, 'es'::text, 'it'::text, 'pt'::text]));

commit;
