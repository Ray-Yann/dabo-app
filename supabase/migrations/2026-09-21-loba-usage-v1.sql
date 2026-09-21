-- DABO — LOBA Usage V1
-- Observabilité serveur des appels au fournisseur IA.
-- Aucun prompt, question, réponse ou contenu du foyer n'est conservé.
-- Les coûts enregistrés constituent un snapshot du tarif appliqué au moment de l'appel.

begin;

create table if not exists public.loba_ai_usage (
  id uuid primary key default gen_random_uuid(),

  surface text not null
    check (surface in ('admin', 'household')),

  provider text not null,
  model text not null,

  user_id uuid null
    references auth.users(id) on delete set null,

  household_id uuid null
    references public.households(id) on delete set null,

  intent text null,
  domain text null,

  status text not null
    check (
      status in (
        'success',
        'provider_error',
        'empty_response',
        'request_error'
      )
    ),

  provider_status integer null,

  prompt_tokens integer null
    check (prompt_tokens is null or prompt_tokens >= 0),

  completion_tokens integer null
    check (completion_tokens is null or completion_tokens >= 0),

  total_tokens integer null
    check (total_tokens is null or total_tokens >= 0),

  input_price_per_million_usd numeric(12,6) null
    check (
      input_price_per_million_usd is null
      or input_price_per_million_usd >= 0
    ),

  output_price_per_million_usd numeric(12,6) null
    check (
      output_price_per_million_usd is null
      or output_price_per_million_usd >= 0
    ),

  input_cost_usd numeric(18,12) null
    check (input_cost_usd is null or input_cost_usd >= 0),

  output_cost_usd numeric(18,12) null
    check (output_cost_usd is null or output_cost_usd >= 0),

  total_cost_usd numeric(18,12) null
    check (total_cost_usd is null or total_cost_usd >= 0),

  created_at timestamptz not null default now()
);

create index if not exists loba_ai_usage_created_at_idx
  on public.loba_ai_usage(created_at desc);

create index if not exists loba_ai_usage_surface_created_at_idx
  on public.loba_ai_usage(surface, created_at desc);

create index if not exists loba_ai_usage_household_created_at_idx
  on public.loba_ai_usage(household_id, created_at desc)
  where household_id is not null;

create index if not exists loba_ai_usage_user_created_at_idx
  on public.loba_ai_usage(user_id, created_at desc)
  where user_id is not null;

alter table public.loba_ai_usage enable row level security;

-- Aucune policy navigateur.
-- Les écritures et lectures d'observabilité passent uniquement
-- par les routes serveur DABO avec service_role.

grant usage on schema public to service_role;
grant select, insert on table public.loba_ai_usage to service_role;


-- Quotas journaliers LOBA.
-- Une ligne = un compteur atomique pour une surface/propriétaire/jour UTC.
-- Cette table ne contient aucun contenu conversationnel.

create table if not exists public.loba_ai_daily_quota (
  surface text not null
    check (surface in ('admin', 'household')),

  owner_id uuid not null,

  quota_date date not null,

  call_count integer not null default 0
    check (call_count >= 0),

  updated_at timestamptz not null default now(),

  primary key (surface, owner_id, quota_date)
);

alter table public.loba_ai_daily_quota enable row level security;

revoke all on table public.loba_ai_daily_quota from anon, authenticated;
grant select, insert, update on table public.loba_ai_daily_quota to service_role;

create or replace function public.reserve_loba_ai_daily_quota(
  p_surface text,
  p_owner_id uuid,
  p_daily_limit integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quota_date date := (current_timestamp at time zone 'UTC')::date;
  v_call_count integer;
begin
  if p_surface not in ('admin', 'household') then
    raise exception 'unsupported LOBA surface';
  end if;

  if p_owner_id is null then
    raise exception 'LOBA quota owner is required';
  end if;

  if p_daily_limit <= 0 then
    raise exception 'LOBA daily limit must be positive';
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
    updated_at = now()
  where public.loba_ai_daily_quota.call_count < p_daily_limit
  returning call_count into v_call_count;

  return v_call_count is not null;
end;
$$;

revoke all on function public.reserve_loba_ai_daily_quota(text, uuid, integer) from public;
revoke all on function public.reserve_loba_ai_daily_quota(text, uuid, integer) from anon, authenticated;
grant execute on function public.reserve_loba_ai_daily_quota(text, uuid, integer) to service_role;

commit;
