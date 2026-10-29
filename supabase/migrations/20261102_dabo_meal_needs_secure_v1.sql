-- Depends on 20261030, 20261031, 20261101 and pantry migration 20261020.
-- Day-scoped, read-only comparison. No recipe IDs, stock IDs or private recipe metadata returned.
create or replace function public.dabo_meal_needs_for_day(p_household uuid, p_date date)
returns table (ingredient_name text, unit text, required numeric, available numeric, missing numeric)
language plpgsql stable security definer set search_path = '' as $$
begin
 if auth.uid() is null or not exists (
   select 1 from public.members m where m.household_id=p_household and m.user_id=auth.uid() and m.left_at is null
 ) then raise exception 'Not a member of this household' using errcode='42501'; end if;
 if p_date is null then raise exception 'Date required'; end if;
 -- Fail closed: silently omitting a revoked/deleted recipe would understate
 -- the shopping needs. Do not disclose which recipe is unavailable.
 if exists (
   select 1 from public.dabo_meal_plans p
   where p.household_id = p_household and p.planned_for = p_date
     and (p.recipe_id is null or not public.dabo_recipe_can_read(p.recipe_id))
 ) then
   raise exception 'Meal needs unavailable: review inaccessible recipes in the plan'
     using errcode = '22023';
 end if;
 return query
 with visible_meals as (
  select p.recipe_id, p.portions::numeric as meal_portions, r.portions::numeric as recipe_portions
  from public.dabo_meal_plans p
  join public.dabo_recipes r on r.id=p.recipe_id
  where p.household_id=p_household and p.planned_for=p_date
    and public.dabo_recipe_can_read(p.recipe_id)
 ), needed as (
  select lower(btrim(i.name)) as ingredient_key,
   case when i.unit='kg' then 'g' when i.unit='l' then 'ml' else i.unit end as normalized_unit,
   sum(i.amount * m.meal_portions / m.recipe_portions *
       case when i.unit in ('kg','l') then 1000 else 1 end) as total_required
  from visible_meals m join public.dabo_recipe_ingredients i on i.recipe_id=m.recipe_id
  group by lower(btrim(i.name)), case when i.unit='kg' then 'g' when i.unit='l' then 'ml' else i.unit end
 ), in_stock as (
  select lower(btrim(s.name)) as ingredient_key,
   case when s.unit='kg' then 'g' when s.unit='l' then 'ml' else s.unit end as normalized_unit,
   sum(s.quantity * case when s.unit in ('kg','l') then 1000 else 1 end) as total_available
  from public.pantry_stocks s
  where s.household_id=p_household and s.quantity>0
   and (s.expires_on is null or s.expires_on>=p_date)
  group by lower(btrim(s.name)), case when s.unit='kg' then 'g' when s.unit='l' then 'ml' else s.unit end
 )
 select n.ingredient_key, n.normalized_unit, n.total_required,
   coalesce(s.total_available,0::numeric),
   greatest(n.total_required-coalesce(s.total_available,0::numeric),0::numeric)
 from needed n left join in_stock s
   on s.ingredient_key=n.ingredient_key and s.normalized_unit=n.normalized_unit
 order by n.ingredient_key,n.normalized_unit;
end $$;
revoke all on function public.dabo_meal_needs_for_day(uuid,date) from public,anon;
grant execute on function public.dabo_meal_needs_for_day(uuid,date) to authenticated;
