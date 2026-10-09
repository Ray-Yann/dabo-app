-- V5.1: a materialization must be tied to a persisted, actor-owned proposal.
begin;
-- Ensure the proposal creator belongs to the same household.
-- Preserve multi-household membership.
alter table public.members
 add constraint members_id_household_id_unique unique(id,household_id);

create table public.closed_loop_proposals (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete cascade,
 created_by uuid not null,
 constraint closed_loop_proposals_creator_household_fk
  foreign key (created_by,household_id)
  references public.members(id,household_id)
  on delete cascade,
 plan jsonb not null,
 version integer not null default 1 check(version=1),
 state text not null default 'pending' check(state in ('pending','executed')),
 request_id uuid not null default gen_random_uuid(),
 need_id uuid references public.household_needs(id) on delete cascade,
 created_at timestamptz not null default now(),
 executed_at timestamptz,
 unique(household_id,request_id),
 check(jsonb_typeof(plan)='object'),
 check((state='pending' and need_id is null and executed_at is null) or (state='executed' and need_id is not null and executed_at is not null))
);
alter table public.closed_loop_proposals enable row level security;
revoke all on public.closed_loop_proposals from public,anon,authenticated,service_role;
-- Service role writes only from the authenticated server route. No client table grants.
grant select,insert on public.closed_loop_proposals to service_role;

create function public.closed_loop_execute_approved_proposal(p_actor_user_id uuid,p_proposal_id uuid,p_version integer)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_proposal public.closed_loop_proposals%rowtype; v_member uuid; v_result jsonb;
begin
 if p_actor_user_id is null or p_proposal_id is null or p_version is null then raise exception 'Invalid approval'; end if;
 select * into v_proposal from public.closed_loop_proposals where id=p_proposal_id for update;
 if not found then raise exception 'Proposal unavailable'; end if;
 select id into v_member from public.members where household_id=v_proposal.household_id and user_id=p_actor_user_id and left_at is null and id=v_proposal.created_by;
 if v_member is null then raise exception 'Proposal access denied'; end if;
 if v_proposal.version<>p_version then raise exception 'Proposal version mismatch'; end if;
 if v_proposal.state='executed' then
  return jsonb_build_object('needId',v_proposal.need_id,'replayed',true);
 end if;
 if v_proposal.state<>'pending' then raise exception 'Proposal unavailable'; end if;
 v_result:=public.closed_loop_materialize_plan(p_actor_user_id,v_proposal.household_id,v_proposal.request_id,v_proposal.plan);
 update public.closed_loop_proposals set state='executed',need_id=(v_result->>'needId')::uuid,executed_at=now() where id=v_proposal.id;
 return v_result;
end;
$$;
revoke all on function public.closed_loop_execute_approved_proposal(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.closed_loop_execute_approved_proposal(uuid,uuid,integer) to service_role;
commit;
