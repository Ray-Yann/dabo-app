-- P2.3 Perception Gap V1
-- Subjective perception is stored separately from factual household load.
-- A member may only declare their own perception.

create table if not exists public.member_load_perceptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  perception text not null check (
    perception in (
      'balanced',
      'i_carry_more',
      'other_carries_more',
      'unclear'
    )
  ),
  declared_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists member_load_perceptions_household_declared_idx
  on public.member_load_perceptions (household_id, declared_at desc);

create index if not exists member_load_perceptions_member_declared_idx
  on public.member_load_perceptions (member_id, declared_at desc);

alter table public.member_load_perceptions enable row level security;

revoke all on table public.member_load_perceptions from anon, authenticated;

-- A member can privately read their own declarations only.
create policy "Members read own load perceptions"
on public.member_load_perceptions
for select
to authenticated
using (
  exists (
    select 1
    from public.members m
    where m.id = member_load_perceptions.member_id
      and m.household_id = member_load_perceptions.household_id
      and m.user_id = auth.uid()
      and m.left_at is null
  )
);

create or replace function public.save_member_load_perception(
  p_household_id uuid,
  p_perception text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member_id uuid;
  v_perception_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if p_perception not in (
    'balanced',
    'i_carry_more',
    'other_carries_more',
    'unclear'
  ) then
    raise exception 'LOAD_PERCEPTION_INVALID' using errcode = '22023';
  end if;

  select m.id
  into v_member_id
  from public.members m
  where m.household_id = p_household_id
    and m.user_id = auth.uid()
    and m.left_at is null
  limit 1;

  if v_member_id is null then
    raise exception 'ACTIVE_MEMBER_REQUIRED' using errcode = '42501';
  end if;

  insert into public.member_load_perceptions (
    household_id,
    member_id,
    perception
  )
  values (
    p_household_id,
    v_member_id,
    p_perception
  )
  returning id into v_perception_id;

  return v_perception_id;
end;
$$;

revoke all on function public.save_member_load_perception(uuid, text) from public;
revoke all on function public.save_member_load_perception(uuid, text) from anon, authenticated;
grant execute on function public.save_member_load_perception(uuid, text) to authenticated;


-- Privacy-preserving household aggregate.
-- Individual perceptions are never returned by this function.
-- At least 3 distinct respondents in the rolling 7-day window are required.
create or replace function public.get_household_load_perception_summary(
  p_household_id uuid
)
returns table (
  enough_responses boolean,
  response_count integer,
  balanced_count integer,
  i_carry_more_count integer,
  other_carries_more_count integer,
  unclear_count integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_requesting_member_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select m.id
  into v_requesting_member_id
  from public.members m
  where m.household_id = p_household_id
    and m.user_id = auth.uid()
    and m.left_at is null
  limit 1;

  if v_requesting_member_id is null then
    raise exception 'ACTIVE_MEMBER_REQUIRED' using errcode = '42501';
  end if;

  return query
  with latest_per_member as (
    select distinct on (p.member_id)
      p.member_id,
      p.perception
    from public.member_load_perceptions p
    join public.members m
      on m.id = p.member_id
     and m.household_id = p.household_id
     and m.left_at is null
    where p.household_id = p_household_id
      and p.declared_at >= now() - interval '7 days'
    order by p.member_id, p.declared_at desc, p.id desc
  ),
  counts as (
    select
      count(*)::integer as total,
      count(*) filter (where perception = 'balanced')::integer as balanced,
      count(*) filter (where perception = 'i_carry_more')::integer as i_carry_more,
      count(*) filter (where perception = 'other_carries_more')::integer as other_carries_more,
      count(*) filter (where perception = 'unclear')::integer as unclear
    from latest_per_member
  )
  select
    counts.total >= 3,
    counts.total,
    case when counts.total >= 3 then counts.balanced else 0 end,
    case when counts.total >= 3 then counts.i_carry_more else 0 end,
    case when counts.total >= 3 then counts.other_carries_more else 0 end,
    case when counts.total >= 3 then counts.unclear else 0 end
  from counts;
end;
$$;

revoke all on function public.get_household_load_perception_summary(uuid) from public;
revoke all on function public.get_household_load_perception_summary(uuid) from anon, authenticated;
grant execute on function public.get_household_load_perception_summary(uuid) to authenticated;
