-- DABO — LOBA Global Quota V1
-- Garde-fou global journalier pour les appels IA.
-- La reservation du quota individuel et du quota global est atomique.

begin;

create table if not exists public.loba_ai_global_daily_quota (
  quota_date date primary key,

  call_count integer not null default 0
    check (call_count >= 0),

  updated_at timestamptz not null default now()
);

alter table public.loba_ai_global_daily_quota enable row level security;

revoke all on table public.loba_ai_global_daily_quota from anon, authenticated;
grant select, insert, update on table public.loba_ai_global_daily_quota to service_role;

create or replace function public.reserve_loba_ai_daily_budget(
  p_surface text,
  p_owner_id uuid,
  p_owner_daily_limit integer,
  p_global_daily_limit integer
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quota_date date := (current_timestamp at time zone 'UTC')::date;
  v_owner_count integer;
  v_global_count integer;
begin
  if p_surface not in ('admin', 'household') then
    raise exception 'unsupported LOBA surface';
  end if;

  if p_owner_id is null then
    raise exception 'LOBA quota owner is required';
  end if;

  if p_owner_daily_limit <= 0 then
    raise exception 'LOBA owner daily limit must be positive';
  end if;

  if p_global_daily_limit <= 0 then
    raise exception 'LOBA global daily limit must be positive';
  end if;

  -- Serialize reservations for the current UTC day.
  perform pg_advisory_xact_lock(
    hashtext('loba-global-' || v_quota_date::text)
  );

  select call_count
  into v_global_count
  from public.loba_ai_global_daily_quota
  where quota_date = v_quota_date;

  if coalesce(v_global_count, 0) >= p_global_daily_limit then
    return 'global_exhausted';
  end if;

  select call_count
  into v_owner_count
  from public.loba_ai_daily_quota
  where surface = p_surface
    and owner_id = p_owner_id
    and quota_date = v_quota_date;

  if coalesce(v_owner_count, 0) >= p_owner_daily_limit then
    return 'owner_exhausted';
  end if;

  insert into public.loba_ai_daily_quota (
    surface,
    owner_id,
    quota_date,
    call_count,
    updated_at
  )
  values (
    p_surface,
    p_owner_id,
    v_quota_date,
    1,
    now()
  )
  on conflict (surface, owner_id, quota_date)
  do update
  set
    call_count = public.loba_ai_daily_quota.call_count + 1,
    updated_at = now();

  insert into public.loba_ai_global_daily_quota (
    quota_date,
    call_count,
    updated_at
  )
  values (
    v_quota_date,
    1,
    now()
  )
  on conflict (quota_date)
  do update
  set
    call_count = public.loba_ai_global_daily_quota.call_count + 1,
    updated_at = now();

  return 'allowed';
end;
$$;

revoke all on function public.reserve_loba_ai_daily_budget(
  text,
  uuid,
  integer,
  integer
) from public;

revoke all on function public.reserve_loba_ai_daily_budget(
  text,
  uuid,
  integer,
  integer
) from anon, authenticated;

grant execute on function public.reserve_loba_ai_daily_budget(
  text,
  uuid,
  integer,
  integer
) to service_role;

commit;
