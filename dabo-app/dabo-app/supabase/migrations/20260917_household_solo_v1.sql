begin;

-- DABO V2 — Foyer Solo V1
-- Le type "solo" est un vrai type de foyer, pas un mode UI temporaire.
alter table public.households
  drop constraint if exists households_household_type_check;

alter table public.households
  add constraint households_household_type_check
  check (household_type in ('solo', 'couple', 'coloc', 'famille'));

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
  if v_type not in ('solo', 'couple', 'coloc', 'famille') then
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
