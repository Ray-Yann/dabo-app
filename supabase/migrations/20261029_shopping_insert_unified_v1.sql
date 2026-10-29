-- Shared insert route for manual, import, suggestion, LOBA and future recipes.
-- Explicit p_skip_existing=true only for recipe-generated missing items.
create or replace function public.dabo_shopping_add_items(
 p_household_id uuid, p_items jsonb, p_skip_existing boolean default false
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
 v_item jsonb; v_name text; v_quantity text; v_store text;
 v_assigned uuid; v_due date; v_urgent boolean;
 v_added integer := 0; v_skipped integer := 0; v_id uuid; v_existing_id uuid; v_existing_quantity text;
 v_results jsonb := '[]'::jsonb; v_conflicts jsonb := '[]'::jsonb;
 v_existing_count integer; v_duplicate_count integer;
begin
 if auth.uid() is null or not exists (
  select 1 from public.members m where m.household_id=p_household_id
  and m.user_id=auth.uid() and m.left_at is null
 ) then raise exception 'Not authorized' using errcode='42501'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 100 then
  raise exception 'Invalid items';
 end if;
 -- Serializes calls through this RPC per household. Does not protect legacy direct inserts.
 -- Receipt purchases and LOBA plan materialization retain their own distinct semantics.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_household_id::text, 93421));
 for v_item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(v_item) <> 'object' then raise exception 'Invalid item'; end if;
  v_name := pg_catalog.btrim(v_item->>'name');
  if v_name is null or length(v_name) not between 1 and 160 then raise exception 'Invalid name'; end if;
  v_quantity := nullif(pg_catalog.btrim(v_item->>'quantity'), '');
  v_store := nullif(pg_catalog.btrim(v_item->>'store_name'), '');
  if length(coalesce(v_quantity,'')) > 120 or length(coalesce(v_store,'')) > 160 then raise exception 'Invalid item fields'; end if;
  v_urgent := coalesce((v_item->>'urgent')::boolean, false);
  v_due := nullif(v_item->>'due_date','')::date;
  v_assigned := nullif(v_item->>'assigned_to','')::uuid;
  if v_assigned is not null and not exists (
   select 1 from public.members m where m.id=v_assigned and m.household_id=p_household_id and m.left_at is null
  ) then raise exception 'Invalid assignee' using errcode='42501'; end if;
  -- In recipe mode, never silently discard a different requested quantity.
  -- The caller must ask the user whether to keep or adjust the existing line.
  if p_skip_existing then
   v_existing_id := null;
   v_existing_quantity := null;
   -- Count all matches, not just the first: never choose arbitrarily among duplicates.
   select count(*) into v_existing_count
   from public.shopping_items s
   where s.household_id=p_household_id and s.status='to_buy'
     and lower(pg_catalog.btrim(s.name))=lower(v_name)
     and lower(coalesce(pg_catalog.btrim(s.store_name),''))=lower(coalesce(v_store,''));
   select s.id, s.quantity into v_existing_id, v_existing_quantity
   from public.shopping_items s
   where s.household_id=p_household_id and s.status='to_buy'
     and lower(pg_catalog.btrim(s.name))=lower(v_name)
     and lower(coalesce(pg_catalog.btrim(s.store_name),''))=lower(coalesce(v_store,''))
   order by s.created_at asc, s.id asc limit 1;
   if v_existing_id is not null then
    if v_existing_count > 1 then
     v_conflicts := v_conflicts || pg_catalog.jsonb_build_array(
       pg_catalog.jsonb_build_object('kind','multiple_existing',
         'name',v_name,'store_name',v_store,'existing_count',v_existing_count,
         'requested_quantity',v_quantity));
    elsif coalesce(lower(pg_catalog.btrim(v_existing_quantity)),'')
       = coalesce(lower(pg_catalog.btrim(v_quantity)),'') then
     v_skipped:=v_skipped+1;
    else
     v_conflicts := v_conflicts || pg_catalog.jsonb_build_array(
       pg_catalog.jsonb_build_object('existing_id',v_existing_id,
         'name',v_name,'store_name',v_store,
         'kind','quantity_mismatch','existing_quantity',v_existing_quantity,'requested_quantity',v_quantity));
    end if;
    continue;
   end if;
  end if;
  insert into public.shopping_items (household_id,name,quantity,urgent,assigned_to,due_date,store_name)
  values (p_household_id,v_name,v_quantity,v_urgent,v_assigned,v_due,v_store)
  returning id into v_id;
  v_added:=v_added+1;
  v_results:=v_results || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('id',v_id,'name',v_name,'quantity',v_quantity,'status','to_buy'));
 end loop;
 return pg_catalog.jsonb_build_object('added',v_added,'skipped',v_skipped,'conflicts',v_conflicts,'items',v_results);
end;
$$;
revoke all on function public.dabo_shopping_add_items(uuid,jsonb,boolean) from public,anon;
grant execute on function public.dabo_shopping_add_items(uuid,jsonb,boolean) to authenticated;
