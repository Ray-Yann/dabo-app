-- Apply only after 20261030_dabo_recipes_secure_v1.sql, on a test database first.
create table public.dabo_meal_plans (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete cascade,
 recipe_id uuid references public.dabo_recipes(id) on delete set null,
 planned_for date not null,
 meal_slot text not null check (meal_slot in ('breakfast','lunch','dinner','snack')),
 portions integer not null check (portions between 1 and 100),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create index dabo_meal_plans_household_date on public.dabo_meal_plans(household_id,planned_for);
alter table public.dabo_meal_plans enable row level security;
-- IMPORTANT: recipe details must be queried separately through recipe RLS.
-- A household member may see the slot but cannot infer a revoked recipe's title.
create policy dabo_meal_plans_read on public.dabo_meal_plans for select to authenticated using (
 exists (select 1 from public.members m where m.household_id=dabo_meal_plans.household_id and m.user_id=auth.uid() and m.left_at is null)
);
revoke all on public.dabo_meal_plans from public,anon,authenticated;
grant select on public.dabo_meal_plans to authenticated;

create function public.dabo_meal_plan_add(p_household uuid,p_recipe uuid,p_date date,p_slot text,p_portions integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 if auth.uid() is null or not exists (select 1 from public.members m where m.household_id=p_household and m.user_id=auth.uid() and m.left_at is null) then
  raise exception 'Not a member of this household';
 end if;
 if p_recipe is null or not public.dabo_recipe_can_read(p_recipe) then raise exception 'Recipe unavailable'; end if;
 if p_date is null or p_date < current_date - 30 or p_date > current_date + 366 then raise exception 'Date out of range'; end if;
 insert into public.dabo_meal_plans(household_id,recipe_id,planned_for,meal_slot,portions,created_by)
 values(p_household,p_recipe,p_date,p_slot,p_portions,auth.uid()) returning id into v_id;
 return v_id;
end $$;
create function public.dabo_meal_plan_remove(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 delete from public.dabo_meal_plans p where p.id=p_id and exists (
  select 1 from public.members m where m.household_id=p.household_id and m.user_id=auth.uid() and m.left_at is null
 );
 if not found then raise exception 'Meal not found or not authorized'; end if;
end $$;
revoke all on function public.dabo_meal_plan_add(uuid,uuid,date,text,integer),public.dabo_meal_plan_remove(uuid) from public,anon;
grant execute on function public.dabo_meal_plan_add(uuid,uuid,date,text,integer),public.dabo_meal_plan_remove(uuid) to authenticated;
