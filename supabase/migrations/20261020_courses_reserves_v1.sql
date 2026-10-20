-- DABO Courses / Mes réserves V1. Apply in Supabase SQL Editor after reviewing.
create table if not exists public.pantry_locations (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete cascade,
 name text not null check (char_length(btrim(name)) between 1 and 70),
 kind text not null check (kind in ('fridge','freezer','cupboard','other')),
 created_at timestamptz not null default now(),
 unique (id, household_id)
);
create table if not exists public.pantry_stocks (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete cascade,
 location_id uuid not null,
 name text not null check (char_length(btrim(name)) between 1 and 120),
 quantity numeric(12,3) not null check (quantity >= 0 and quantity <= 1000000 and quantity::text <> 'NaN'),
 unit text not null check (unit in ('piece','g','kg','ml','l')),
 expires_on date,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (id, household_id),
 foreign key (location_id, household_id) references public.pantry_locations(id, household_id)
);
create table if not exists public.pantry_movements (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete cascade,
 stock_id uuid not null,
 actor_id uuid not null references auth.users(id),
 action text not null check (action in ('created','added','consumed','transferred')),
 delta numeric(12,3) not null,
 quantity_after numeric(12,3) not null check (quantity_after >= 0),
 previous_location_id uuid,
 location_id uuid,
 created_at timestamptz not null default now(),
 foreign key (stock_id, household_id) references public.pantry_stocks(id, household_id)
);
create index if not exists pantry_stocks_household_location on public.pantry_stocks(household_id,location_id);
create index if not exists pantry_movements_stock_date on public.pantry_movements(stock_id,created_at desc);

alter table public.pantry_locations enable row level security;
alter table public.pantry_stocks enable row level security;
alter table public.pantry_movements enable row level security;
-- Only reads through RLS; all writes go through validated, atomic RPCs.
create policy pantry_locations_read on public.pantry_locations for select to authenticated using
 (exists(select 1 from public.members m where m.household_id=pantry_locations.household_id and m.user_id=auth.uid() and m.left_at is null));
create policy pantry_stocks_read on public.pantry_stocks for select to authenticated using
 (exists(select 1 from public.members m where m.household_id=pantry_stocks.household_id and m.user_id=auth.uid() and m.left_at is null));
create policy pantry_movements_read on public.pantry_movements for select to authenticated using
 (exists(select 1 from public.members m where m.household_id=pantry_movements.household_id and m.user_id=auth.uid() and m.left_at is null));
revoke all on public.pantry_locations,public.pantry_stocks,public.pantry_movements from anon,authenticated;
grant select on public.pantry_locations,public.pantry_stocks,public.pantry_movements to authenticated;

create or replace function public.pantry_location_create(p_household uuid,p_name text,p_kind text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.members m where m.household_id=p_household and m.user_id=auth.uid() and m.left_at is null) then raise exception 'Not authorized'; end if;
 if p_name is null or char_length(btrim(p_name)) not between 1 and 70 or p_kind not in ('fridge','freezer','cupboard','other') then raise exception 'Invalid location'; end if;
 insert into public.pantry_locations(household_id,name,kind) values(p_household,btrim(p_name),p_kind) returning id into v_id;
 return v_id;
end $$;

create or replace function public.pantry_stock_create(p_household uuid,p_location uuid,p_name text,p_quantity numeric,p_unit text,p_expires date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.members m where m.household_id=p_household and m.user_id=auth.uid() and m.left_at is null) then raise exception 'Not authorized'; end if;
 if not exists(select 1 from public.pantry_locations l where l.id=p_location and l.household_id=p_household) then raise exception 'Invalid location'; end if;
 if p_name is null or char_length(btrim(p_name)) not between 1 and 120 or p_quantity is null or p_quantity::text in ('NaN','Infinity','-Infinity') or p_quantity <= 0 or p_quantity > 1000000 or p_quantity <> round(p_quantity,3) or p_unit is null or p_unit not in ('piece','g','kg','ml','l') or (p_unit='piece' and p_quantity<>trunc(p_quantity)) then raise exception 'Invalid stock'; end if;
 insert into public.pantry_stocks(household_id,location_id,name,quantity,unit,expires_on) values(p_household,p_location,btrim(p_name),p_quantity,p_unit,p_expires) returning id into v_id;
 insert into public.pantry_movements(household_id,stock_id,actor_id,action,delta,quantity_after,location_id) values(p_household,v_id,auth.uid(),'created',p_quantity,p_quantity,p_location);
 return v_id;
end $$;

create or replace function public.pantry_stock_change(p_household uuid,p_stock uuid,p_delta numeric,p_destination uuid default null)
returns numeric language plpgsql security definer set search_path = '' as $$
declare v_stock public.pantry_stocks%rowtype; v_after numeric;
begin
 if auth.uid() is null or not exists(select 1 from public.members m where m.household_id=p_household and m.user_id=auth.uid() and m.left_at is null) then raise exception 'Not authorized'; end if;
 select * into v_stock from public.pantry_stocks where id=p_stock and household_id=p_household for update;
 if not found then raise exception 'Stock not found'; end if;
 if p_delta is null or p_delta::text in ('NaN','Infinity','-Infinity') or abs(p_delta)>1000000 or p_delta<>round(p_delta,3) or (v_stock.unit='piece' and p_delta<>trunc(p_delta)) then raise exception 'Invalid delta'; end if;
 -- A transfer only changes the location; adding/consuming only changes quantity.
 if p_destination is not null and p_delta<>0 then raise exception 'Transfer cannot change quantity'; end if;
 if p_destination is not null and not exists(select 1 from public.pantry_locations where id=p_destination and household_id=p_household) then raise exception 'Invalid destination'; end if;
 if p_delta=0 and (p_destination is null or p_destination=v_stock.location_id) then raise exception 'No change'; end if;
 v_after:=v_stock.quantity+p_delta;
 if v_after<0 or v_after>1000000 then raise exception 'Insufficient or excessive quantity'; end if;
 update public.pantry_stocks set quantity=v_after,location_id=coalesce(p_destination,v_stock.location_id),updated_at=now() where id=p_stock;
 insert into public.pantry_movements(household_id,stock_id,actor_id,action,delta,quantity_after,previous_location_id,location_id)
 values(p_household,p_stock,auth.uid(),case when p_delta>0 then 'added' when p_delta<0 then 'consumed' else 'transferred' end,p_delta,v_after,v_stock.location_id,coalesce(p_destination,v_stock.location_id));
 return v_after;
end $$;
revoke all on function public.pantry_location_create(uuid,text,text),public.pantry_stock_create(uuid,uuid,text,numeric,text,date),public.pantry_stock_change(uuid,uuid,numeric,uuid) from public,anon;
grant execute on function public.pantry_location_create(uuid,text,text),public.pantry_stock_create(uuid,uuid,text,numeric,text,date),public.pantry_stock_change(uuid,uuid,numeric,uuid) to authenticated;
