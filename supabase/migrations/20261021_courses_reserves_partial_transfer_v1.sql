-- DABO Mes réserves V1: atomic partial or full transfer between household locations.
-- Apply once in Supabase SQL Editor BEFORE deploying the matching UI.
create or replace function public.pantry_stock_transfer_partial(
 p_household uuid, p_stock uuid, p_destination uuid, p_quantity numeric
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
 v_source public.pantry_stocks%rowtype;
 v_target public.pantry_stocks%rowtype;
 v_target_id uuid;
 v_after numeric;
begin
 if auth.uid() is null or not exists (
  select 1 from public.members m where m.household_id=p_household
  and m.user_id=auth.uid() and m.left_at is null
 ) then raise exception 'Not authorized'; end if;
 if p_stock is null or p_destination is null or p_quantity is null
  or p_quantity::text in ('NaN','Infinity','-Infinity')
  or p_quantity<=0 or p_quantity>1000000 or p_quantity<>round(p_quantity,3)
 then raise exception 'Invalid transfer quantity'; end if;
 if not exists(select 1 from public.pantry_locations l where l.id=p_destination and l.household_id=p_household)
 then raise exception 'Invalid destination'; end if;
 -- Serialize partial transfers within one household to avoid duplicate destination rows.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_household::text, 1729));
 select * into v_source from public.pantry_stocks
 where id=p_stock and household_id=p_household for update;
 if not found then raise exception 'Stock not found'; end if;
 if v_source.location_id=p_destination then raise exception 'Same location'; end if;
 if v_source.unit='piece' and p_quantity<>trunc(p_quantity) then raise exception 'Pieces must be whole'; end if;
 if p_quantity>v_source.quantity then raise exception 'Insufficient quantity'; end if;
 -- Merge with an equivalent product in the destination, if one exists.
 select * into v_target from public.pantry_stocks
 where household_id=p_household and location_id=p_destination
 and lower(btrim(name))=lower(btrim(v_source.name))
 and unit=v_source.unit and expires_on is not distinct from v_source.expires_on
 order by created_at,id limit 1 for update;
 if found then
  if v_target.quantity+p_quantity>1000000 then raise exception 'Destination stock limit'; end if;
  update public.pantry_stocks set quantity=quantity+p_quantity,updated_at=now()
  where id=v_target.id;
  v_target_id:=v_target.id;
  v_after:=v_target.quantity+p_quantity;
 else
  insert into public.pantry_stocks(household_id,location_id,name,quantity,unit,expires_on)
  values(p_household,p_destination,v_source.name,p_quantity,v_source.unit,v_source.expires_on)
  returning id into v_target_id;
  v_after:=p_quantity;
 end if;
 update public.pantry_stocks set quantity=quantity-p_quantity,updated_at=now()
 where id=v_source.id;
 insert into public.pantry_movements
 (household_id,stock_id,actor_id,action,delta,quantity_after,previous_location_id,location_id)
 values
 (p_household,v_source.id,auth.uid(),'transferred',-p_quantity,v_source.quantity-p_quantity,v_source.location_id,p_destination),
 (p_household,v_target_id,auth.uid(),'transferred',p_quantity,v_after,v_source.location_id,p_destination);
 return v_target_id;
end $$;
revoke all on function public.pantry_stock_transfer_partial(uuid,uuid,uuid,numeric) from public,anon;
grant execute on function public.pantry_stock_transfer_partial(uuid,uuid,uuid,numeric) to authenticated;
