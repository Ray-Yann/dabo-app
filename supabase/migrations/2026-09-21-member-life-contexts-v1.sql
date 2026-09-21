create table if not exists public.member_life_contexts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,

  context_type text not null
    check (
      context_type in (
        'busy_period',
        'studies',
        'travel',
        'away',
        'reduced_availability',
        'other'
      )
    ),

  impact text not null default 'reduced'
    check (impact in ('reduced', 'very_reduced')),

  starts_on date not null,
  ends_on date not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint member_life_contexts_dates_check
    check (ends_on >= starts_on)
);

create index if not exists member_life_contexts_household_idx
  on public.member_life_contexts (household_id);

create index if not exists member_life_contexts_member_idx
  on public.member_life_contexts (member_id);

create index if not exists member_life_contexts_active_period_idx
  on public.member_life_contexts (household_id, starts_on, ends_on);

alter table public.member_life_contexts enable row level security;

create policy "Household members can view life contexts"
  on public.member_life_contexts
  for select
  to authenticated
  using (
    public.is_active_household_member(household_id)
  );

revoke all
  on table public.member_life_contexts
  from anon, authenticated;

grant select
  on table public.member_life_contexts
  to authenticated;

create or replace function public.save_member_life_context(
  p_household_id uuid,
  p_context_type text,
  p_impact text,
  p_starts_on date,
  p_ends_on date,
  p_context_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member_id uuid;
  v_context_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if p_context_type not in (
    'busy_period',
    'studies',
    'travel',
    'away',
    'reduced_availability',
    'other'
  ) then
    raise exception 'LIFE_CONTEXT_TYPE_INVALID' using errcode = '22023';
  end if;

  if p_impact not in ('reduced', 'very_reduced') then
    raise exception 'LIFE_CONTEXT_IMPACT_INVALID' using errcode = '22023';
  end if;

  if p_starts_on is null or p_ends_on is null or p_ends_on < p_starts_on then
    raise exception 'LIFE_CONTEXT_DATES_INVALID' using errcode = '22023';
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

  if p_context_id is not null and not exists (
    select 1
    from public.member_life_contexts lc
    where lc.id = p_context_id
      and lc.household_id = p_household_id
      and lc.member_id = v_member_id
  ) then
    raise exception 'LIFE_CONTEXT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.member_life_contexts lc
    where lc.household_id = p_household_id
      and lc.member_id = v_member_id
      and (p_context_id is null or lc.id <> p_context_id)
      and lc.starts_on <= p_ends_on
      and lc.ends_on >= p_starts_on
  ) then
    raise exception 'LIFE_CONTEXT_OVERLAP' using errcode = '23P01';
  end if;

  if p_context_id is null then
    insert into public.member_life_contexts (
      household_id,
      member_id,
      context_type,
      impact,
      starts_on,
      ends_on
    )
    values (
      p_household_id,
      v_member_id,
      p_context_type,
      p_impact,
      p_starts_on,
      p_ends_on
    )
    returning id into v_context_id;
  else
    update public.member_life_contexts
    set
      context_type = p_context_type,
      impact = p_impact,
      starts_on = p_starts_on,
      ends_on = p_ends_on,
      updated_at = now()
    where id = p_context_id
      and household_id = p_household_id
      and member_id = v_member_id
    returning id into v_context_id;
  end if;

  return v_context_id;
end;
$$;

revoke all on function public.save_member_life_context(
  uuid,
  text,
  text,
  date,
  date,
  uuid
) from public;

revoke all on function public.save_member_life_context(
  uuid,
  text,
  text,
  date,
  date,
  uuid
) from anon, authenticated;

grant execute on function public.save_member_life_context(
  uuid,
  text,
  text,
  date,
  date,
  uuid
) to authenticated;

create or replace function public.delete_member_life_context(
  p_household_id uuid,
  p_context_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
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

  delete from public.member_life_contexts
  where id = p_context_id
    and household_id = p_household_id
    and member_id = v_member_id;

  if not found then
    raise exception 'LIFE_CONTEXT_NOT_FOUND' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.delete_member_life_context(
  uuid,
  uuid
) from public;

revoke all on function public.delete_member_life_context(
  uuid,
  uuid
) from anon, authenticated;

grant execute on function public.delete_member_life_context(
  uuid,
  uuid
) to authenticated;
