begin;

create or replace function public.join_household_by_invite(
  p_invite_code text,
  p_first_name text,
  p_language text default 'fr'
)
returns table (
  household_id uuid,
  member_id uuid,
  member_role text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_household_id uuid;
  v_member_id uuid;
  v_role text;
  v_active_count integer;
  v_existing_left_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if nullif(trim(p_invite_code), '') is null then
    raise exception 'INVITE_REQUIRED' using errcode = '22023';
  end if;

  if nullif(trim(p_first_name), '') is null then
    raise exception 'FIRST_NAME_REQUIRED' using errcode = '22023';
  end if;

  -- Lock the household row so two simultaneous joins cannot both become creator.
  select h.id
    into v_household_id
  from public.households h
  where upper(h.invite_code) = upper(trim(p_invite_code))
  for update;

  if v_household_id is null then
    raise exception 'INVITE_NOT_FOUND' using errcode = 'P0002';
  end if;

  select m.id, m.role, m.left_at
    into v_member_id, v_role, v_existing_left_at
  from public.members m
  where m.household_id = v_household_id
    and m.user_id = v_user_id
  limit 1;

  if v_member_id is not null and v_existing_left_at is null then
    return query select v_household_id, v_member_id, v_role;
    return;
  end if;

  select count(*)::integer
    into v_active_count
  from public.members m
  where m.household_id = v_household_id
    and m.left_at is null
    and m.user_id is not null;

  v_role := case when v_active_count = 0 then 'creator' else 'member' end;

  if v_member_id is not null then
    update public.members
       set left_at = null,
           first_name = trim(p_first_name),
           language = coalesce(nullif(trim(p_language), ''), language),
           role = v_role,
           rotation_order = v_active_count
     where id = v_member_id;
  else
    insert into public.members (
      household_id,
      user_id,
      first_name,
      role,
      language,
      rotation_order
    ) values (
      v_household_id,
      v_user_id,
      trim(p_first_name),
      v_role,
      coalesce(nullif(trim(p_language), ''), 'fr'),
      v_active_count
    )
    returning id into v_member_id;
  end if;

  return query select v_household_id, v_member_id, v_role;
end;
$$;

revoke all on function public.join_household_by_invite(text, text, text) from public;
grant execute on function public.join_household_by_invite(text, text, text) to authenticated;

commit;
