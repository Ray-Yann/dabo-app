-- DABO Finance V1 — fondation financière du foyer.
-- Migration ciblée et idempotente. Ne pas exécuter supabase-schema.sql en production.
-- Principe : une facture payée pointe vers UNE dépense ; elle n'est jamais additionnée une seconde fois.

begin;

create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by_member_id uuid not null references public.members(id) on delete restrict,
  paid_by_member_id uuid references public.members(id) on delete set null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'EUR' check (char_length(currency) = 3),
  category text not null check (category in ('courses','logement','energie','transport','abonnements','sante','enfants','loisirs','maison','autre')),
  label text not null check (char_length(trim(label)) between 1 and 120),
  occurred_on date not null default current_date,
  source text not null default 'manual' check (source in ('manual','loba','shopping_session','receipt_scan','bill_payment','bank_import','recurring')),
  status text not null default 'posted' check (status in ('posted','void')),
  visibility text not null default 'household' check (visibility in ('household','private')),
  private_owner_member_id uuid references public.members(id) on delete cascade,
  shopping_session_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((visibility = 'household' and private_owner_member_id is null) or (visibility = 'private' and private_owner_member_id is not null))
);

create table if not exists public.finance_bill_series (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by_member_id uuid not null references public.members(id) on delete restrict,
  label text not null check (char_length(trim(label)) between 1 and 120),
  category text not null check (category in ('courses','logement','energie','transport','abonnements','sante','enfants','loisirs','maison','autre')),
  expected_amount numeric(12,2) check (expected_amount is null or expected_amount >= 0),
  currency text not null default 'EUR' check (char_length(currency) = 3),
  frequency text not null check (frequency in ('monthly','yearly')),
  day_of_month smallint check (day_of_month between 1 and 31),
  month_of_year smallint check (month_of_year between 1 and 12),
  active boolean not null default true,
  visibility text not null default 'household' check (visibility in ('household','private')),
  private_owner_member_id uuid references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((visibility = 'household' and private_owner_member_id is null) or (visibility = 'private' and private_owner_member_id is not null)),
  check ((frequency = 'monthly' and day_of_month is not null) or (frequency = 'yearly' and day_of_month is not null and month_of_year is not null))
);

create table if not exists public.finance_bills (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by_member_id uuid not null references public.members(id) on delete restrict,
  series_id uuid references public.finance_bill_series(id) on delete set null,
  label text not null check (char_length(trim(label)) between 1 and 120),
  category text not null check (category in ('courses','logement','energie','transport','abonnements','sante','enfants','loisirs','maison','autre')),
  amount numeric(12,2) check (amount is null or amount >= 0),
  currency text not null default 'EUR' check (char_length(currency) = 3),
  due_on date not null,
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  paid_transaction_id uuid unique references public.finance_transactions(id) on delete set null,
  visibility text not null default 'household' check (visibility in ('household','private')),
  private_owner_member_id uuid references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((visibility = 'household' and private_owner_member_id is null) or (visibility = 'private' and private_owner_member_id is not null)),
  check ((status = 'paid') = (paid_transaction_id is not null))
);

create table if not exists public.finance_budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by_member_id uuid not null references public.members(id) on delete restrict,
  category text not null check (category in ('courses','logement','energie','transport','abonnements','sante','enfants','loisirs','maison','autre')),
  monthly_reference numeric(12,2) not null check (monthly_reference > 0),
  currency text not null default 'EUR' check (char_length(currency) = 3),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, category)
);

create table if not exists public.shopping_sessions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  shopper_member_id uuid references public.members(id) on delete set null,
  first_bought_at timestamptz not null,
  last_bought_at timestamptz not null,
  item_count integer not null default 1 check (item_count > 0),
  state text not null default 'pending' check (state in ('pending','recorded','dismissed')),
  total_amount numeric(12,2) check (total_amount is null or total_amount >= 0),
  finance_transaction_id uuid unique references public.finance_transactions(id) on delete set null,
  prompted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- FK différée car finance_transactions est créée avant shopping_sessions.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'finance_transactions_shopping_session_id_fkey') then
    alter table public.finance_transactions
      add constraint finance_transactions_shopping_session_id_fkey
      foreign key (shopping_session_id) references public.shopping_sessions(id) on delete set null;
  end if;
end $$;

create unique index if not exists finance_transactions_one_per_shopping_session_idx
  on public.finance_transactions(shopping_session_id) where shopping_session_id is not null and status = 'posted';
create index if not exists finance_transactions_household_date_idx on public.finance_transactions(household_id, occurred_on desc);
create index if not exists finance_transactions_household_category_date_idx on public.finance_transactions(household_id, category, occurred_on desc);
create index if not exists finance_bills_household_due_idx on public.finance_bills(household_id, due_on, status);
create index if not exists finance_bill_series_household_idx on public.finance_bill_series(household_id, active);
create unique index if not exists finance_bills_one_occurrence_per_series_idx on public.finance_bills(series_id, due_on) where series_id is not null;
create index if not exists finance_budgets_household_idx on public.finance_budgets(household_id, active);
create index if not exists shopping_sessions_household_state_idx on public.shopping_sessions(household_id, state, last_bought_at desc);

-- Cohérence membre/foyer, références croisées et audit.
-- Important : ces contrôles restent actifs même avec le service-role, qui contourne la RLS.
create or replace function public.dabo_finance_validate_row()
returns trigger language plpgsql set search_path = public as $$
declare
  row_data jsonb := to_jsonb(new);
  old_data jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  member_id uuid;
  ref_id uuid;
begin
  -- Une ligne financière ne peut pas être déplacée silencieusement vers un autre foyer.
  if tg_op = 'UPDATE' and new.household_id is distinct from old.household_id then
    raise exception 'Finance household cannot be changed';
  end if;

  -- L'auteur est un champ d'audit : il doit appartenir au foyer et ne peut pas être réécrit.
  if row_data ? 'created_by_member_id' then
    member_id := nullif(row_data->>'created_by_member_id','')::uuid;
    if member_id is null or not exists (
      select 1 from public.members m where m.id = member_id and m.household_id = new.household_id
    ) then raise exception 'Finance creator must belong to household'; end if;
    if tg_op = 'UPDATE' and row_data->>'created_by_member_id' is distinct from old_data->>'created_by_member_id' then
      raise exception 'Finance creator cannot be changed';
    end if;
  end if;

  if row_data ? 'paid_by_member_id' then
    member_id := nullif(row_data->>'paid_by_member_id','')::uuid;
    if member_id is not null and not exists (
      select 1 from public.members m where m.id = member_id and m.household_id = new.household_id
    ) then raise exception 'Finance payer must belong to household'; end if;
  end if;

  if row_data ? 'private_owner_member_id' then
    member_id := nullif(row_data->>'private_owner_member_id','')::uuid;
    if member_id is not null and not exists (
      select 1 from public.members m where m.id = member_id and m.household_id = new.household_id
    ) then raise exception 'Finance private owner must belong to household'; end if;
  end if;

  if row_data ? 'shopper_member_id' then
    member_id := nullif(row_data->>'shopper_member_id','')::uuid;
    if member_id is not null and not exists (
      select 1 from public.members m where m.id = member_id and m.household_id = new.household_id
    ) then raise exception 'Shopping session shopper must belong to household'; end if;
  end if;

  -- Les références entre objets financiers doivent rester dans le même foyer.
  if tg_table_name = 'finance_transactions' and new.shopping_session_id is not null then
    if not exists (select 1 from public.shopping_sessions s where s.id = new.shopping_session_id and s.household_id = new.household_id) then
      raise exception 'Shopping session must belong to finance household';
    end if;
  elsif tg_table_name = 'finance_bills' then
    if new.series_id is not null and not exists (select 1 from public.finance_bill_series s where s.id = new.series_id and s.household_id = new.household_id) then
      raise exception 'Bill series must belong to finance household';
    end if;
    if new.paid_transaction_id is not null and not exists (select 1 from public.finance_transactions t where t.id = new.paid_transaction_id and t.household_id = new.household_id and t.status = 'posted') then
      raise exception 'Bill payment transaction must be a posted transaction in the same household';
    end if;
  elsif tg_table_name = 'shopping_sessions' and new.finance_transaction_id is not null then
    if not exists (select 1 from public.finance_transactions t where t.id = new.finance_transaction_id and t.household_id = new.household_id and t.status = 'posted') then
      raise exception 'Shopping finance transaction must be a posted transaction in the same household';
    end if;
  end if;

  return new;
end; $$;

drop trigger if exists finance_transactions_validate_row on public.finance_transactions;
create trigger finance_transactions_validate_row before insert or update on public.finance_transactions for each row execute function public.dabo_finance_validate_row();
drop trigger if exists finance_bills_validate_row on public.finance_bills;
create trigger finance_bills_validate_row before insert or update on public.finance_bills for each row execute function public.dabo_finance_validate_row();
drop trigger if exists finance_bill_series_validate_row on public.finance_bill_series;
create trigger finance_bill_series_validate_row before insert or update on public.finance_bill_series for each row execute function public.dabo_finance_validate_row();
drop trigger if exists finance_budgets_validate_row on public.finance_budgets;
create trigger finance_budgets_validate_row before insert or update on public.finance_budgets for each row execute function public.dabo_finance_validate_row();
drop trigger if exists shopping_sessions_validate_row on public.shopping_sessions;
create trigger shopping_sessions_validate_row before insert or update on public.shopping_sessions for each row execute function public.dabo_finance_validate_row();

-- RLS : données communes visibles par le foyer ; données privées uniquement par leur propriétaire.
-- Les budgets sont des repères du foyer et restent communs.

alter table public.finance_transactions enable row level security;
alter table public.finance_bill_series enable row level security;
alter table public.finance_bills enable row level security;
alter table public.finance_budgets enable row level security;
alter table public.shopping_sessions enable row level security;

-- Helper : le membre connecté correspond-il à cet id ?
create or replace function public.is_current_active_member(target_member_id uuid, target_household_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.members m where m.id=target_member_id and m.household_id=target_household_id and m.user_id=auth.uid() and m.left_at is null);
$$;
grant execute on function public.is_current_active_member(uuid, uuid) to authenticated;

-- Policies finance_transactions
drop policy if exists finance_transactions_select on public.finance_transactions;
drop policy if exists finance_transactions_insert on public.finance_transactions;
drop policy if exists finance_transactions_update on public.finance_transactions;
drop policy if exists finance_transactions_delete on public.finance_transactions;
create policy finance_transactions_select on public.finance_transactions for select to authenticated using (
  public.is_active_household_member(household_id) and (visibility='household' or public.is_current_active_member(private_owner_member_id, household_id))
);
create policy finance_transactions_insert on public.finance_transactions for insert to authenticated with check (
  public.is_active_household_member(household_id) and public.is_current_active_member(created_by_member_id, household_id)
  and (visibility='household' or public.is_current_active_member(private_owner_member_id, household_id))
);
create policy finance_transactions_update on public.finance_transactions for update to authenticated using (
  public.is_active_household_member(household_id) and (visibility='household' or public.is_current_active_member(private_owner_member_id, household_id))
) with check (
  public.is_active_household_member(household_id) and (visibility='household' or public.is_current_active_member(private_owner_member_id, household_id))
);
create policy finance_transactions_delete on public.finance_transactions for delete to authenticated using (
  public.is_active_household_member(household_id) and (visibility='household' or public.is_current_active_member(private_owner_member_id, household_id))
);

-- Même modèle de confidentialité pour factures et séries.
do $$
declare tbl text;
begin
  foreach tbl in array array['finance_bills','finance_bill_series'] loop
    execute format('drop policy if exists %I_select on public.%I', tbl, tbl);
    execute format('drop policy if exists %I_insert on public.%I', tbl, tbl);
    execute format('drop policy if exists %I_update on public.%I', tbl, tbl);
    execute format('drop policy if exists %I_delete on public.%I', tbl, tbl);
    execute format('create policy %I_select on public.%I for select to authenticated using (public.is_active_household_member(household_id) and (visibility=''household'' or public.is_current_active_member(private_owner_member_id, household_id)))', tbl, tbl);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check (public.is_active_household_member(household_id) and public.is_current_active_member(created_by_member_id, household_id) and (visibility=''household'' or public.is_current_active_member(private_owner_member_id, household_id)))', tbl, tbl);
    execute format('create policy %I_update on public.%I for update to authenticated using (public.is_active_household_member(household_id) and (visibility=''household'' or public.is_current_active_member(private_owner_member_id, household_id))) with check (public.is_active_household_member(household_id) and (visibility=''household'' or public.is_current_active_member(private_owner_member_id, household_id)))', tbl, tbl);
    execute format('create policy %I_delete on public.%I for delete to authenticated using (public.is_active_household_member(household_id) and (visibility=''household'' or public.is_current_active_member(private_owner_member_id, household_id)))', tbl, tbl);
  end loop;
end $$;

-- Budgets et sessions Courses : communs au foyer.
drop policy if exists finance_budgets_all_select on public.finance_budgets;
drop policy if exists finance_budgets_all_insert on public.finance_budgets;
drop policy if exists finance_budgets_all_update on public.finance_budgets;
drop policy if exists finance_budgets_all_delete on public.finance_budgets;
create policy finance_budgets_all_select on public.finance_budgets for select to authenticated using (public.is_active_household_member(household_id));
create policy finance_budgets_all_insert on public.finance_budgets for insert to authenticated with check (public.is_active_household_member(household_id) and public.is_current_active_member(created_by_member_id, household_id));
create policy finance_budgets_all_update on public.finance_budgets for update to authenticated using (public.is_active_household_member(household_id)) with check (public.is_active_household_member(household_id));
create policy finance_budgets_all_delete on public.finance_budgets for delete to authenticated using (public.is_active_household_member(household_id));

drop policy if exists shopping_sessions_select on public.shopping_sessions;
drop policy if exists shopping_sessions_insert on public.shopping_sessions;
drop policy if exists shopping_sessions_update on public.shopping_sessions;
drop policy if exists shopping_sessions_delete on public.shopping_sessions;
create policy shopping_sessions_select on public.shopping_sessions for select to authenticated using (public.is_active_household_member(household_id));
create policy shopping_sessions_insert on public.shopping_sessions for insert to authenticated with check (public.is_active_household_member(household_id) and (shopper_member_id is null or public.is_current_active_member(shopper_member_id, household_id)));
create policy shopping_sessions_update on public.shopping_sessions for update to authenticated using (public.is_active_household_member(household_id)) with check (public.is_active_household_member(household_id));
create policy shopping_sessions_delete on public.shopping_sessions for delete to authenticated using (public.is_active_household_member(household_id));

grant select, insert, update, delete on public.finance_transactions to authenticated;
grant select, insert, update, delete on public.finance_bill_series to authenticated;
grant select, insert, update, delete on public.finance_bills to authenticated;
grant select, insert, update, delete on public.finance_budgets to authenticated;
grant select, insert, update, delete on public.shopping_sessions to authenticated;

commit;
