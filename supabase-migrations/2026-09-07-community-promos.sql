-- DABO — Promos visibles par toute la communauté et commentaires associés.
-- Conserve les promotions existantes et leur attribue le prénom de leur auteur.

begin;

alter table public.promos add column if not exists author_name text;

update public.promos p
set author_name = coalesce(m.first_name, 'Membre DABO')
from public.members m
where p.author_id = m.id and p.author_name is null;

update public.promos set author_name = 'Membre DABO' where author_name is null;

alter table public.promos alter column author_name set default 'Membre DABO';
alter table public.promos alter column author_name set not null;

create table if not exists public.promo_comments (
  id uuid primary key default gen_random_uuid(),
  promo_id uuid not null references public.promos(id) on delete cascade,
  household_id uuid references public.households(id) on delete set null,
  author_id uuid references public.members(id) on delete set null,
  author_name text not null default 'Membre DABO',
  text text not null check (char_length(trim(text)) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists promo_comments_promo_created_idx
  on public.promo_comments (promo_id, created_at);

create or replace function public.set_community_content_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_member public.members%rowtype;
begin
  select * into current_member
  from public.members
  where user_id = auth.uid() and left_at is null
  order by created_at desc
  limit 1;

  if current_member.id is null then
    raise exception 'Active DABO member required';
  end if;

  new.author_id := current_member.id;
  new.household_id := current_member.household_id;
  new.author_name := current_member.first_name;
  return new;
end;
$$;

create or replace function public.lock_community_content_author()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.author_id := old.author_id;
  new.household_id := old.household_id;
  new.author_name := old.author_name;
  if tg_table_name = 'promo_comments' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists promos_set_community_author on public.promos;
create trigger promos_set_community_author
before insert on public.promos
for each row execute function public.set_community_content_author();

drop trigger if exists promos_lock_community_author on public.promos;
create trigger promos_lock_community_author
before update on public.promos
for each row execute function public.lock_community_content_author();

drop trigger if exists promo_comments_set_community_author on public.promo_comments;
create trigger promo_comments_set_community_author
before insert on public.promo_comments
for each row execute function public.set_community_content_author();

drop trigger if exists promo_comments_lock_community_author on public.promo_comments;
create trigger promo_comments_lock_community_author
before update on public.promo_comments
for each row execute function public.lock_community_content_author();

alter table public.promos enable row level security;
alter table public.promo_comments enable row level security;

do $$
declare policy_row record;
begin
  for policy_row in select policyname from pg_policies
    where schemaname = 'public' and tablename = 'promos'
  loop
    execute format('drop policy if exists %I on public.promos', policy_row.policyname);
  end loop;
end $$;

create policy "Communauté - voir les promos"
on public.promos for select to authenticated using (true);

create policy "Communauté - publier une promo"
on public.promos for insert to authenticated
with check (author_id in (select id from public.members where user_id = auth.uid() and left_at is null));

create policy "Communauté - modifier sa promo"
on public.promos for update to authenticated
using (author_id in (select id from public.members where user_id = auth.uid() and left_at is null))
with check (author_id in (select id from public.members where user_id = auth.uid() and left_at is null));

create policy "Communauté - supprimer sa promo"
on public.promos for delete to authenticated
using (author_id in (select id from public.members where user_id = auth.uid() and left_at is null));

create policy "Communauté - voir les commentaires"
on public.promo_comments for select to authenticated using (true);

create policy "Communauté - commenter une promo"
on public.promo_comments for insert to authenticated
with check (author_id in (select id from public.members where user_id = auth.uid() and left_at is null));

create policy "Communauté - modifier son commentaire"
on public.promo_comments for update to authenticated
using (author_id in (select id from public.members where user_id = auth.uid() and left_at is null))
with check (author_id in (select id from public.members where user_id = auth.uid() and left_at is null));

create policy "Communauté - supprimer son commentaire"
on public.promo_comments for delete to authenticated
using (author_id in (select id from public.members where user_id = auth.uid() and left_at is null));

commit;
