-- Closed Loop V5.2 — secure server-owned drafts.
begin;

alter table public.closed_loop_proposals
 add constraint closed_loop_proposals_id_household_unique
 unique (id,household_id);

create table public.closed_loop_drafts (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete cascade,
 created_by uuid not null,
 constraint closed_loop_drafts_creator_household_fk
  foreign key (created_by,household_id)
  references public.members(id,household_id)
  on delete cascade,
 original_request text not null
  check (char_length(btrim(original_request)) between 1 and 3000),
 proposal jsonb not null
  check (jsonb_typeof(proposal) = 'object'),
 state text not null default 'pending'
  check (state in ('pending','finalized','cancelled')),
 finalized_proposal_id uuid,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 expires_at timestamptz not null default (now() + interval '24 hours'),
 constraint closed_loop_drafts_proposal_household_fk
  foreign key (finalized_proposal_id,household_id)
  references public.closed_loop_proposals(id,household_id),
 constraint closed_loop_drafts_finalized_check
  check (
   (state = 'finalized' and finalized_proposal_id is not null)
   or
   (state <> 'finalized' and finalized_proposal_id is null)
  )
);

create index closed_loop_drafts_pending_idx
 on public.closed_loop_drafts
 (household_id,created_by,created_at desc)
 where state = 'pending';

alter table public.closed_loop_drafts enable row level security;

revoke all on public.closed_loop_drafts
 from public,anon,authenticated,service_role;

grant select,insert,update
 on public.closed_loop_drafts
 to service_role;

commit;

