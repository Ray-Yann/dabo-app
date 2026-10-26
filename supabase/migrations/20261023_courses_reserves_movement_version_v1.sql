-- DABO 36H.5F - Transactional movement versions and safe purchase reversal.
-- Apply AFTER 20261022_courses_reserves_purchase_sync_v1.sql.
-- Historical movements retain NULL versions; historical purchase credits are not auto-reversed.
-- Existing finance shopping-session behavior and RPC signature are preserved.
BEGIN;

ALTER TABLE public.pantry_stocks
  ADD COLUMN IF NOT EXISTS movement_version bigint NOT NULL DEFAULT 0;
ALTER TABLE public.pantry_movements
  ADD COLUMN IF NOT EXISTS movement_version bigint;

-- Fail rather than silently accepting an incompatible pre-existing schema.
DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pantry_stocks'
      AND column_name='movement_version' AND data_type='bigint'
      AND is_nullable='NO' AND column_default IS NOT NULL
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pantry_movements'
      AND column_name='movement_version' AND data_type='bigint'
  ) THEN
    RAISE EXCEPTION 'Incompatible pantry movement version columns';
  END IF;
END;
$guard$;

ALTER TABLE public.pantry_stocks
  ADD CONSTRAINT pantry_stocks_movement_version_check CHECK (movement_version >= 0);
ALTER TABLE public.pantry_movements
  ADD CONSTRAINT pantry_movements_version_positive CHECK (movement_version IS NULL OR movement_version > 0);
CREATE UNIQUE INDEX pantry_movements_stock_version_unique
  ON public.pantry_movements (stock_id, movement_version)
  WHERE movement_version IS NOT NULL;

CREATE OR REPLACE FUNCTION public.dabo_pantry_assign_movement_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE
  v_next bigint;
BEGIN
  IF NEW.movement_version IS NOT NULL THEN
    RAISE EXCEPTION 'Manual movement version forbidden';
  END IF;
  UPDATE public.pantry_stocks
  SET movement_version = movement_version + 1
  WHERE id = NEW.stock_id AND household_id = NEW.household_id
  RETURNING movement_version INTO v_next;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Movement stock not found';
  END IF;
  NEW.movement_version := v_next;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.dabo_pantry_assign_movement_version()
  FROM PUBLIC, anon, authenticated;
CREATE TRIGGER pantry_movements_assign_version
  BEFORE INSERT ON public.pantry_movements
  FOR EACH ROW EXECUTE FUNCTION public.dabo_pantry_assign_movement_version();

-- Preserve original RPC body, replacing only unsafe created_at-based reversal check.
create or replace function public.dabo_set_shopping_item_status(p_item_id uuid,p_status text)
returns uuid language plpgsql security definer set search_path = 'public' as $$
declare
  v_item public.shopping_items%rowtype;
  v_member_id uuid;
  v_session_id uuid;
  v_now timestamptz := now();
  v_count integer;
  v_first timestamptz;
  v_last timestamptz;
begin
  if p_status not in ('to_buy','bought') then raise exception 'Invalid shopping status'; end if;
  select * into v_item from public.shopping_items where id=p_item_id for update;
  if not found then raise exception 'Shopping item not found'; end if;
  select m.id into v_member_id from public.members m
  where m.household_id=v_item.household_id and m.user_id=auth.uid() and m.left_at is null limit 1;
  if v_member_id is null then raise exception 'Active household member required'; end if;
  if p_status='to_buy' then
    v_session_id:=v_item.shopping_session_id;
    update public.shopping_items set status='to_buy',bought_at=null,
      bought_by_member_id=null,shopping_session_id=null where id=p_item_id;
    -- Safe reversal only when the credited movement is still the latest
    -- movement for this stock and the original quantity is available.
    -- Otherwise retain the credit and flag a human correction.
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(v_item.household_id::text,1729));
    declare
      v_credit public.pantry_purchase_sync%rowtype;
      v_stock public.pantry_stocks%rowtype;
      v_reverse_id uuid;
      v_after numeric;
    begin
      select * into v_credit from public.pantry_purchase_sync
      where shopping_item_id=p_item_id for update;
      if found and v_credit.state='stocked' then
        select * into v_stock from public.pantry_stocks
        where id=v_credit.stock_id and household_id=v_item.household_id for update;
        if found and v_stock.quantity>=v_credit.quantity and
          v_stock.movement_version > 0 and exists (
            select 1 from public.pantry_movements pm
            where pm.id=v_credit.movement_id
              and pm.stock_id=v_stock.id
              and pm.household_id=v_item.household_id
              and pm.movement_version=v_stock.movement_version
          ) then
          v_after:=v_stock.quantity-v_credit.quantity;
          update public.pantry_stocks set quantity=v_after,updated_at=v_now where id=v_stock.id;
          insert into public.pantry_movements
            (household_id,stock_id,actor_id,action,delta,quantity_after,previous_location_id,location_id)
          values(v_item.household_id,v_stock.id,auth.uid(),'consumed',
            -v_credit.quantity,v_after,v_stock.location_id,v_stock.location_id)
          returning id into v_reverse_id;
          update public.pantry_purchase_sync set state='reversed',
            reversal_movement_id=v_reverse_id,note='Achat annulé : crédit compensé',updated_at=v_now
          where id=v_credit.id;
        else
          update public.pantry_purchase_sync set state='correction_needed',
            note='Achat annulé : stock modifié depuis le crédit, vérification nécessaire',updated_at=v_now
          where id=v_credit.id;
        end if;
      elsif found and v_credit.state='needs_quantity' then
        update public.pantry_purchase_sync set state='reversed',
          note='Achat annulé avant confirmation de la quantité',updated_at=v_now
        where id=v_credit.id;
      end if;
    end;
    if v_session_id is not null then
      select count(*),min(bought_at),max(bought_at) into v_count,v_first,v_last
      from public.shopping_items where shopping_session_id=v_session_id
        and status='bought' and id<>p_item_id;
      if v_count=0 then
        delete from public.shopping_sessions
        where id=v_session_id and state='pending' and finance_transaction_id is null;
      else
        update public.shopping_sessions set item_count=v_count,
          first_bought_at=coalesce(v_first,first_bought_at),
          last_bought_at=coalesce(v_last,last_bought_at),prompted_at=null,updated_at=v_now
        where id=v_session_id and state='pending';
      end if;
    end if;
    return null;
  end if;
  if v_item.status='bought' then return v_item.shopping_session_id; end if;
  select s.id into v_session_id from public.shopping_sessions s
  where s.household_id=v_item.household_id and s.shopper_member_id=v_member_id
    and s.state='pending' and s.finance_transaction_id is null
    and s.last_bought_at>=v_now-interval '8 hours'
  order by s.last_bought_at desc limit 1 for update;
  if v_session_id is null then
    insert into public.shopping_sessions(household_id,shopper_member_id,first_bought_at,last_bought_at,item_count,state)
    values(v_item.household_id,v_member_id,v_now,v_now,1,'pending') returning id into v_session_id;
  else
    update public.shopping_sessions set last_bought_at=v_now,item_count=item_count+1,
      prompted_at=null,updated_at=v_now where id=v_session_id;
  end if;
  update public.shopping_items set status='bought',bought_at=v_now,
    bought_by_member_id=v_member_id,shopping_session_id=v_session_id where id=p_item_id;
  perform public.dabo_pantry_credit_purchase(p_item_id);
  return v_session_id;
end $$;

REVOKE ALL ON FUNCTION public.dabo_set_shopping_item_status(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dabo_set_shopping_item_status(uuid,text) TO authenticated;

COMMIT;
