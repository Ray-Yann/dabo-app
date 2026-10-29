-- DABO: atomic 1–7-day meal needs -> shopping list bridge.
-- Requires dabo_meal_needs_for_period(uuid,date,date) and
-- dabo_shopping_add_items(uuid,jsonb,boolean). Does not alter pantry stocks.
create or replace function public.dabo_meal_shopping_add_for_period(
  p_household uuid, p_from date, p_to date, p_selected jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_items jsonb := '[]'::jsonb;
  v_row record;
begin
  if auth.uid() is null or not exists (
    select 1 from public.members m
    where m.household_id = p_household and m.user_id = auth.uid() and m.left_at is null
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to > p_from + 6 then
    raise exception 'Invalid period' using errcode = '22023';
  end if;
  if jsonb_typeof(p_selected) is distinct from 'array'
     or jsonb_array_length(p_selected) not between 1 and 100 then
    raise exception 'Invalid selection' using errcode = '22023';
  end if;
  if exists (
    select 1 from pg_catalog.jsonb_array_elements(p_selected) as x(item)
    where jsonb_typeof(x.item) is distinct from 'object'
       or jsonb_typeof(x.item->'name') is distinct from 'string'
       or jsonb_typeof(x.item->'unit') is distinct from 'string'
       or length(pg_catalog.btrim(x.item->>'name')) not between 1 and 160
       or x.item->>'unit' not in ('piece','g','ml')
  ) then
    raise exception 'Invalid ingredient selection' using errcode = '22023';
  end if;

  -- Same advisory key as the shared shopping insert RPC. The server
  -- recalculates needs while the household lock is held.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_household::text, 93421)
  );
  for v_row in
    select n.ingredient_name, n.unit, n.missing
    from public.dabo_meal_needs_for_period(p_household, p_from, p_to) n
    where n.missing > 0 and exists (
      select 1 from pg_catalog.jsonb_array_elements(p_selected) as x(item)
      where pg_catalog.lower(pg_catalog.btrim(x.item->>'name')) =
            pg_catalog.lower(pg_catalog.btrim(n.ingredient_name))
        and x.item->>'unit' = n.unit
    )
  loop
    v_items := v_items || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('name', v_row.ingredient_name,
        'quantity', v_row.missing::text || ' ' || v_row.unit)
    );
  end loop;
  if pg_catalog.jsonb_array_length(v_items) = 0 then
    return pg_catalog.jsonb_build_object('added',0,'skipped',0,
      'conflicts','[]'::jsonb,'items','[]'::jsonb);
  end if;
  return public.dabo_shopping_add_items(p_household, v_items, true);
end;
$$;
revoke all on function public.dabo_meal_shopping_add_for_period(uuid,date,date,jsonb)
  from public, anon;
grant execute on function public.dabo_meal_shopping_add_for_period(uuid,date,date,jsonb)
  to authenticated;
