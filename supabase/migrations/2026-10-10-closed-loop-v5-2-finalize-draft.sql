-- Closed Loop V5.2 — finalize a server-owned draft atomically.
begin;

create or replace function public.closed_loop_finalize_draft(
 p_actor_user_id uuid,
 p_draft_id uuid,
 p_details jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
 v_draft public.closed_loop_drafts%rowtype;
 v_plan jsonb;
 v_actions jsonb := '[]'::jsonb;
 v_action jsonb;
 v_detail jsonb;
 v_position integer := 0;
 v_proposal_id uuid;
 v_version integer;
 v_date text;
 v_key text;
begin
 if p_actor_user_id is null or p_draft_id is null
    or coalesce(jsonb_typeof(p_details),'') <> 'object' then
  raise exception 'Invalid draft finalization request';
 end if;

 select * into v_draft
 from public.closed_loop_drafts
 where id = p_draft_id
 for update;

 if not found then
  raise exception 'Draft unavailable';
 end if;

 if not exists (
  select 1 from public.members
  where id = v_draft.created_by
   and household_id = v_draft.household_id
   and user_id = p_actor_user_id
   and left_at is null
 ) then
  raise exception 'Draft access denied';
 end if;

 if v_draft.state = 'finalized' then
  return jsonb_build_object(
   'proposalId',v_draft.finalized_proposal_id,
   'version',1,
   'replayed',true
  );
 end if;

 if v_draft.state <> 'pending' or v_draft.expires_at <= now() then
  raise exception 'Draft unavailable or expired';
 end if;

 if coalesce(jsonb_typeof(v_draft.proposal->'actions'),'') <> 'array' then
  raise exception 'Invalid stored proposal';
 end if;

 if jsonb_array_length(v_draft.proposal->'actions') not between 1 and 20 then
  raise exception 'Invalid stored action count';
 end if;

 if coalesce(length(btrim(v_draft.proposal->>'needTitle')),0)
    not between 1 and 240
    or coalesce(v_draft.proposal->>'resolutionMode','')
       not in ('deterministic','human_required') then
  raise exception 'Invalid stored proposal';
 end if;

 for v_key in select jsonb_object_keys(p_details) loop
  if v_key !~ '^(0|[1-9][0-9]*)$'
     or length(v_key) > 2
     or v_key::integer >= jsonb_array_length(v_draft.proposal->'actions') then
   raise exception 'Unexpected action position';
  end if;
 end loop;
 for v_action in
  select value from jsonb_array_elements(v_draft.proposal->'actions')
 loop
  v_detail := coalesce(p_details->(v_position::text),'{}'::jsonb);

  if coalesce(jsonb_typeof(v_detail),'') <> 'object' then
   raise exception 'Invalid action details';
  end if;

  for v_key in select jsonb_object_keys(v_detail) loop
   if v_key not in ('eventDate','dueOn') then
    raise exception 'Unsupported detail';
   end if;
  end loop;


  if coalesce(v_action->>'resourceType','') not in (
   'task','shopping_item','calendar_event',
   'finance_bill','human_confirmation'
  ) then
   raise exception 'Unsupported draft resource';
  end if;

  if coalesce(v_action->>'role','') not in (
   'progress','required','resolves','evidence'
  ) then
   raise exception 'Invalid draft action role';
  end if;

  if coalesce(length(btrim(v_action->>'label')),0)
     not between 1 and 240 then
   raise exception 'Invalid draft action label';
  end if;

  if v_action->>'resourceType' = 'calendar_event'
     and v_action->>'role' in ('resolves','evidence') then
   raise exception 'Calendar cannot resolve a need';
  end if;

  if v_action->>'resourceType' = 'human_confirmation'
     and v_draft.proposal->>'resolutionMode' <> 'human_required' then
   raise exception 'Invalid human confirmation mode';
  end if;
  if v_action->>'resourceType' = 'calendar_event'
     and (v_detail ? 'dueOn') then
   raise exception 'Unexpected calendar detail';
  end if;
  if v_action->>'resourceType' = 'finance_bill'
     and (v_detail ? 'eventDate') then
   raise exception 'Unexpected bill detail';
  end if;
  if v_action->>'resourceType' = 'calendar_event' then
   v_date := v_detail->>'eventDate';
   if v_date is null or v_date !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Valid event date required';
   end if;
   begin
    if to_char(make_date(substring(v_date,1,4)::integer,substring(v_date,6,2)::integer,substring(v_date,9,2)::integer),'YYYY-MM-DD') <> v_date then
     raise exception 'Valid event date required';
    end if;
   exception when datetime_field_overflow or invalid_datetime_format or invalid_parameter_value then
    raise exception 'Valid event date required';
   end;
   v_action := v_action || jsonb_build_object('eventDate',v_date);
  elsif v_action->>'resourceType' = 'finance_bill' then
   v_date := v_detail->>'dueOn';
   if v_date is null or v_date !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Valid bill date required';
   end if;
   begin
    if to_char(make_date(substring(v_date,1,4)::integer,substring(v_date,6,2)::integer,substring(v_date,9,2)::integer),'YYYY-MM-DD') <> v_date then
     raise exception 'Valid bill date required';
    end if;
   exception when datetime_field_overflow or invalid_datetime_format or invalid_parameter_value then
    raise exception 'Valid bill date required';
   end;
   v_action := v_action || jsonb_build_object('dueOn',v_date);
  elsif v_detail <> '{}'::jsonb then
   raise exception 'Unexpected action details';
  end if;

  v_action := jsonb_build_object(
   'resourceType',v_action->>'resourceType',
   'role',v_action->>'role',
   'label',v_action->>'label',
   'position',v_position
  );
  v_actions := v_actions || jsonb_build_array(v_action);
  v_position := v_position + 1;
 end loop;

 if v_draft.proposal->>'resolutionMode' = 'deterministic'
    and not exists (
     select 1
     from jsonb_array_elements(v_actions) as elem(value)
     where elem.value->>'role' = 'resolves'
       and elem.value->>'resourceType' in ('task','shopping_item','finance_bill')
    ) then
  raise exception 'Deterministic plan requires a resolution action';
 end if;

 if v_draft.proposal->>'resolutionMode' = 'human_required'
    and not exists (
     select 1
     from jsonb_array_elements(v_actions) as elem(value)
     where elem.value->>'resourceType' = 'human_confirmation'
    ) then
  raise exception 'Human resolution mode requires confirmation action';
 end if;
 v_plan := jsonb_build_object(
  'needTitle',v_draft.proposal->>'needTitle',
  'resolutionMode',v_draft.proposal->>'resolutionMode',
  'actions',v_actions
 );

 insert into public.closed_loop_proposals(
  household_id,created_by,plan
 )
 values(v_draft.household_id,v_draft.created_by,v_plan)
 returning id,version into v_proposal_id,v_version;

 update public.closed_loop_drafts
 set state='finalized',
     finalized_proposal_id=v_proposal_id,
     updated_at=now()
 where id=v_draft.id;

 return jsonb_build_object(
  'proposalId',v_proposal_id,
  'version',v_version,
  'replayed',false
 );
end;
$$;

revoke all on function public.closed_loop_finalize_draft(uuid,uuid,jsonb)
 from PUBLIC,anon,authenticated,service_role;

grant execute on function public.closed_loop_finalize_draft(uuid,uuid,jsonb)
 to service_role;

commit;














