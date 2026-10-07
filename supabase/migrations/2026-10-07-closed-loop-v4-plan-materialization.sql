-- DABO Closed Loop V4 — atomic, idempotent materialisation of an explicitly approved plan.
-- Reasoning proposes. A server-authenticated human confirmation reaches this private RPC.
-- The RPC creates operational resources and links them to one need in one transaction;
-- it never marks real-world work as completed.
begin;

create table if not exists public.closed_loop_materializations(
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete cascade,
 request_id uuid not null,
 need_id uuid not null references public.household_needs(id) on delete cascade,
 plan_fingerprint text not null,
 created_by uuid references public.members(id) on delete set null,
 created_at timestamptz not null default now(),
 unique(household_id,request_id)
);
alter table public.closed_loop_materializations enable row level security;
revoke all on public.closed_loop_materializations from public,anon,authenticated;

create or replace function public.closed_loop_materialize_plan(
 p_actor_user_id uuid,
 p_household_id uuid,
 p_request_id uuid,
 p_plan jsonb
) returns jsonb
language plpgsql security definer
set search_path=public,pg_temp
as $$
declare
 v_member public.members%rowtype;
 v_existing public.closed_loop_materializations%rowtype;
 v_need_id uuid;
 v_action jsonb;
 v_resource_id uuid;
 v_type text;
 v_role text;
 v_label text;
 v_resolution_mode text;
 v_position int:=0;
 v_count int;
 v_fingerprint text;
 v_event_date date;
 v_due_on date;
 v_amount numeric(12,2);
 v_category text;
 v_quantity text;
begin
 if p_actor_user_id is null or p_household_id is null or p_request_id is null or jsonb_typeof(p_plan)<>'object' then raise exception 'Invalid materialization request'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_household_id::text||':'||p_request_id::text,0));
 select * into v_member from public.members m where m.household_id=p_household_id and m.user_id=p_actor_user_id and m.left_at is null limit 1;
 if v_member.id is null then raise exception 'Household access denied'; end if;

 v_fingerprint:=md5(p_plan::text);
 select * into v_existing from public.closed_loop_materializations m where m.household_id=p_household_id and m.request_id=p_request_id for update;
 if v_existing.id is not null then
  if v_existing.created_by is distinct from v_member.id then raise exception 'Request id belongs to another member'; end if;
  if v_existing.plan_fingerprint<>v_fingerprint then raise exception 'Request id already used for another plan'; end if;
  return jsonb_build_object('needId',v_existing.need_id,'replayed',true);
 end if;

 if coalesce(length(btrim(p_plan->>'needTitle')),0) not between 1 and 240 then raise exception 'Invalid need title'; end if;
 v_resolution_mode:=p_plan->>'resolutionMode';
 if v_resolution_mode not in('deterministic','human_required') then raise exception 'Invalid resolution mode'; end if;
 if jsonb_typeof(p_plan->'actions')<>'array' then raise exception 'Actions must be an array'; end if;
 v_count:=jsonb_array_length(p_plan->'actions');
 if v_count<1 or v_count>20 then raise exception 'Invalid action count'; end if;

 insert into public.household_needs(household_id,title,status,resolution_mode,created_by)
 values(p_household_id,btrim(p_plan->>'needTitle'),'open',v_resolution_mode,v_member.id)
 returning id into v_need_id;

 for v_action in select value from jsonb_array_elements(p_plan->'actions') loop
  if jsonb_typeof(v_action)<>'object' then raise exception 'Invalid action'; end if;
  v_type:=v_action->>'resourceType'; v_role:=v_action->>'role'; v_label:=btrim(v_action->>'label'); v_resource_id:=null;
  if v_type not in('task','shopping_item','calendar_event','finance_bill','human_confirmation') then raise exception 'Unsupported materialization resource'; end if;
  if v_role not in('progress','required','resolves','evidence') then raise exception 'Invalid action role'; end if;
  if v_type='calendar_event' and v_role in('resolves','evidence') then raise exception 'Calendar cannot prove or resolve a real-world need'; end if;
  if v_type='human_confirmation' and v_resolution_mode<>'human_required' then raise exception 'Human confirmation requires human resolution mode'; end if;
  if coalesce(length(v_label),0) not between 1 and 240 then raise exception 'Invalid action label'; end if;
  begin
   if (v_action->>'position')::int<>v_position then raise exception 'Invalid action position'; end if;
  exception when invalid_text_representation then raise exception 'Invalid action position'; end;

  if v_type='task' then
   insert into public.tasks(household_id,name,status,urgent,weight_points) values(p_household_id,v_label,'pending',false,15) returning id into v_resource_id;
  elsif v_type='shopping_item' then
   v_quantity:=nullif(btrim(v_action->>'quantity'),'');
   insert into public.shopping_items(household_id,name,quantity,status,urgent) values(p_household_id,v_label,v_quantity,'to_buy',false) returning id into v_resource_id;
  elsif v_type='calendar_event' then
   begin v_event_date:=(v_action->>'eventDate')::date; exception when others then raise exception 'Calendar date required'; end;
   if v_event_date is null then raise exception 'Calendar date required'; end if;
   insert into public.calendar_events(household_id,created_by,title,event_date,recurring,reminder_days_before,visibility,private_owner_id)
   values(p_household_id,v_member.id,v_label,v_event_date,false,7,'household',null) returning id into v_resource_id;
  elsif v_type='finance_bill' then
   begin v_due_on:=(v_action->>'dueOn')::date; exception when others then raise exception 'Bill due date required'; end;
   if v_due_on is null then raise exception 'Bill due date required'; end if;
   v_category:=coalesce(nullif(v_action->>'category',''),'autre');
   if v_category not in('courses','logement','energie','transport','abonnements','sante','enfants','loisirs','maison','autre') then raise exception 'Invalid bill category'; end if;
   if v_action ? 'amount' and jsonb_typeof(v_action->'amount')<>'null' then
    begin v_amount:=(v_action->>'amount')::numeric; exception when others then raise exception 'Invalid bill amount'; end;
    if v_amount<0 then raise exception 'Invalid bill amount'; end if;
   else v_amount:=null; end if;
   -- Finance V1 is currently EUR-only across DABO. Multi-currency is a separate cross-product migration.
   insert into public.finance_bills(household_id,created_by_member_id,label,category,amount,currency,due_on,status,visibility)
   values(p_household_id,v_member.id,left(v_label,120),v_category,v_amount,'EUR',v_due_on,'pending','household') returning id into v_resource_id;
  end if;

  insert into public.household_need_actions(need_id,household_id,resource_type,resource_id,role,position)
  values(v_need_id,p_household_id,v_type,v_resource_id,v_role,v_position);
  v_position:=v_position+1;
 end loop;

 if v_resolution_mode='human_required' and not exists(
  select 1 from public.household_need_actions a where a.need_id=v_need_id and a.resource_type='human_confirmation'
 ) then raise exception 'Human resolution mode requires confirmation action'; end if;

 perform public.closed_loop_refresh_need_system(v_need_id);
 insert into public.closed_loop_materializations(household_id,request_id,need_id,plan_fingerprint,created_by)
 values(p_household_id,p_request_id,v_need_id,v_fingerprint,v_member.id);
 return jsonb_build_object('needId',v_need_id,'replayed',false);
end;
$$;
revoke all on function public.closed_loop_materialize_plan(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.closed_loop_materialize_plan(uuid,uuid,uuid,jsonb) to service_role;
commit;
