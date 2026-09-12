-- DABO — Security Households V1
-- Ferme la découverte des foyers/codes d'invitation, centralise les créations
-- et jointures sensibles côté base, et bloque l'auto-élévation de privilèges.

begin;

-- 1) Un compte ne lit que les foyers auxquels il appartient activement.
drop policy if exists "Voir un foyer (connecté)" on public.households;
drop policy if exists "Voir ses foyers actifs" on public.households;
create policy "Voir ses foyers actifs"
on public.households for select to authenticated
using (public.is_active_household_member(id));

-- La création directe exposait une fenêtre foyer-orphélin. Elle passe désormais
-- exclusivement par create_household_with_creator().
drop policy if exists "Créer un foyer" on public.households;

-- 2) Les insertions directes de membres ne sont plus nécessaires : la jointure
-- et la création utilisent des RPC SECURITY DEFINER bornés.
drop policy if exists "Rejoindre un foyer" on public.members;

-- 3) Les mises à jour directes de members sont limitées aux seules colonnes de
-- profil. Une RLS permissive ne peut pas, à elle seule, empêcher un utilisateur
-- de changer son propre rôle : les privilèges de colonnes ferment ce chemin.
revoke update on table public.members from anon;
revoke update on table public.members from authenticated;
grant update (first_name, language, dark_mode, avatar_color, avatar_url, avatar_path, avatar_emoji)
  on table public.members to authenticated;

-- Le changement de rôle passe par une opération dédiée qui vérifie le creator
-- et ne permet de toucher ni user_id, ni household_id, ni left_at.
create or replace function public.promote_household_member_to_creator(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_household_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select m.household_id into v_household_id
  from public.members m
  where m.id = p_member_id
    and m.left_at is null
    and m.user_id is not null;

  if v_household_id is null then
    raise exception 'MEMBER_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not public.is_household_creator(v_household_id) then
    raise exception 'CREATOR_REQUIRED' using errcode = '42501';
  end if;

  update public.members set role = 'creator' where id = p_member_id;
end;
$$;

revoke all on function public.promote_household_member_to_creator(uuid) from public;
grant execute on function public.promote_household_member_to_creator(uuid) to authenticated;

-- 4) Création atomique : foyer + creator dans la même transaction RPC.
create or replace function public.create_household_with_creator(
  p_name text,
  p_household_type text,
  p_first_name text,
  p_language text default 'fr'
)
returns table (
  household_id uuid,
  household_name text,
  invite_code text,
  member_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_household_id uuid;
  v_member_id uuid;
  v_invite_code text;
  v_name text := coalesce(nullif(trim(p_name), ''), 'Notre foyer');
  v_type text := lower(coalesce(nullif(trim(p_household_type), ''), 'couple'));
  v_attempt integer := 0;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  if nullif(trim(p_first_name), '') is null then
    raise exception 'FIRST_NAME_REQUIRED' using errcode = '22023';
  end if;
  if v_type not in ('couple', 'coloc', 'famille') then
    raise exception 'HOUSEHOLD_TYPE_INVALID' using errcode = '22023';
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_invite_code := upper(substr(md5(random()::text || clock_timestamp()::text || v_user_id::text), 1, 8));
    begin
      insert into public.households (name, invite_code, household_type)
      values (v_name, v_invite_code, v_type)
      returning id into v_household_id;
      exit;
    exception when unique_violation then
      if v_attempt >= 8 then
        raise exception 'INVITE_CODE_GENERATION_FAILED';
      end if;
    end;
  end loop;

  insert into public.members (
    household_id, user_id, first_name, role, language, rotation_order
  ) values (
    v_household_id, v_user_id, trim(p_first_name), 'creator',
    coalesce(nullif(trim(p_language), ''), 'fr'), 0
  ) returning id into v_member_id;

  return query select v_household_id, v_name, v_invite_code, v_member_id;
end;
$$;

revoke all on function public.create_household_with_creator(text, text, text, text) from public;
grant execute on function public.create_household_with_creator(text, text, text, text) to authenticated;

commit;
