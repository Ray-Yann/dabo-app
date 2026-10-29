-- Requires dabo_shopping_add_items(uuid,jsonb,boolean) and dabo_meal_needs_for_day(uuid,date).
-- The shared shopping RPC owns the per-household advisory lock and deduplication.
-- IMPORTANT: this handles one day; weekly needs must use a period-aware calculation before rollout.
create or replace function public.dabo_meal_shopping_add_selected(
  p_household uuid, p_date date, p_selected jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_items jsonb := '[]'::jsonb;
  v_row record;
  v_result jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.members m
    where m.household_id = p_household and m.user_id = auth.uid() and m.left_at is null
  ) then
    raise exception 'Not a member of this household' using errcode='42501';
  end if;
  if p_date is null or jsonb_typeof(p_selected) is distinct from 'array'
    or jsonb_array_length(p_selected) not between 1 and 100 then
    raise exception 'Invalid selection' using errcode='22023';
  end if;
  if exists (
    select 1 from pg_catalog.jsonb_array_elements(p_selected) e
    where jsonb_typeof(e) is distinct from 'object'
      or jsonb_typeof(e->'name') is distinct from 'string'
      or jsonb_typeof(e->'unit') is distinct from 'string'
      or length(pg_catalog.btrim(e->>'name')) not between 1 and 160
      or e->>'unit' not in ('piece','g','kg','ml','l')
  ) then
    raise exception 'Invalid ingredient selection' using errcode='22023';
  end if;
  -- The authoritative ingredient quantities are fetched on the server.
  -- Explicitly lock the household before reading needs, so two concurrent
  -- bridge calls cannot both observe the same pre-insert shopping state.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_household::text, 93421));
  for v_row in
    select n.ingredient_name, n.unit, n.missing
    from public.dabo_meal_needs_for_day(p_household, p_date) n
    where n.missing > 0 and exists (
      select 1 from pg_catalog.jsonb_array_elements(p_selected) e
      where pg_catalog.lower(pg_catalog.btrim(e->>'name')) = pg_catalog.lower(pg_catalog.btrim(n.ingredient_name))
        and e->>'unit' = n.unit
    )
  loop
    v_items := v_items || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'name', v_row.ingredient_name,
        'quantity', v_row.missing::text || ' ' || v_row.unit
      )
    );
  end loop;
  if pg_catalog.jsonb_array_length(v_items) = 0 then
    return pg_catalog.jsonb_build_object('added',0,'skipped',0,'conflicts','[]'::jsonb,'items','[]'::jsonb);
  end if;
  -- A single implementation of the insertion/deduplication policy.
  v_result := public.dabo_shopping_add_items(p_household, v_items, true);
  return v_result;
end;
$$;
revoke all on function public.dabo_meal_shopping_add_selected(uuid,date,jsonb) from public, anon;
grant execute on function public.dabo_meal_shopping_add_selected(uuid,date,jsonb) to authenticated;
