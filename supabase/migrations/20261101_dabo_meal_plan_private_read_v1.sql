-- Depends on 20261030 and 20261031. Run on isolated Supabase first.
-- Never expose recipe identifiers through household-wide meal-plan SELECT.
drop policy if exists dabo_meal_plans_read on public.dabo_meal_plans;
revoke select on public.dabo_meal_plans from authenticated;

create or replace function public.dabo_meal_plan_list(p_household uuid, p_date date)
returns table (id uuid, planned_for date, meal_slot text, portions integer, recipe_title text)
language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null or not exists (
   select 1 from public.members m
   where m.household_id = p_household and m.user_id = auth.uid() and m.left_at is null
 ) then
   raise exception 'Not a member of this household' using errcode = '42501';
 end if;
 if p_date is null then raise exception 'Date required'; end if;
 return query
 select p.id, p.planned_for, p.meal_slot, p.portions,
   case when p.recipe_id is not null and public.dabo_recipe_can_read(p.recipe_id)
     then r.title else null::text end as recipe_title
 from public.dabo_meal_plans p
 left join public.dabo_recipes r on r.id = p.recipe_id
 where p.household_id = p_household and p.planned_for = p_date
 order by p.created_at, p.id;
end $$;
revoke all on function public.dabo_meal_plan_list(uuid,date) from public, anon;
grant execute on function public.dabo_meal_plan_list(uuid,date) to authenticated;
