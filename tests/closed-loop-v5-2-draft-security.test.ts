import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const drafts=readFileSync(
 "supabase/migrations/2026-10-10-closed-loop-v5-2-drafts.sql","utf8"
);
const finalize=readFileSync(
 "supabase/migrations/2026-10-10-closed-loop-v5-2-finalize-draft.sql","utf8"
);

test("V5.2 isolates drafts and finalized proposals by household",()=>{
 assert.match(drafts,/foreign key \(created_by,household_id\)/i);
 assert.match(drafts,/foreign key \(finalized_proposal_id,household_id\)/i);
 assert.match(drafts,/references public\.closed_loop_proposals\(id,household_id\)/i);
});

test("V5.2 restricts draft access to the server",()=>{
 assert.match(drafts,/enable row level security/i);
 assert.match(drafts,/grant select,insert,update\s+on public\.closed_loop_drafts\s+to service_role/i);
 assert.doesNotMatch(drafts,/grant (?:select|insert|update|all)\s+on public\.closed_loop_drafts\s+to authenticated/i);
});

test("V5.2 locks drafts and checks active membership",()=>{
 assert.match(finalize,/from public\.closed_loop_drafts\s+where id = p_draft_id\s+for update/i);
 assert.match(finalize,/user_id = p_actor_user_id/i);
 assert.match(finalize,/left_at is null/i);
});

test("V5.2 rejects expired or cancelled drafts",()=>{
 assert.match(finalize,/v_draft\.state <> 'pending'/i);
 assert.match(finalize,/v_draft\.expires_at <= now\(\)/i);
});

test("V5.2 supports idempotent finalization",()=>{
 assert.match(finalize,/if v_draft\.state = 'finalized' then/i);
 assert.match(finalize,/'replayed',true/i);
 assert.match(finalize,/set state='finalized'/i);
});

test("V5.2 validates resource types and positions",()=>{
 assert.match(finalize,/Unsupported draft resource/);
 assert.match(finalize,/Unexpected action position/);
 assert.match(finalize,/coalesce\(jsonb_typeof\(v_draft\.proposal->'actions'\),''\)/);
});

test("V5.2 uses strict calendar validation",()=>{
 assert.match(finalize,/make_date\(/);
 assert.match(finalize,/invalid_parameter_value/);
 assert.match(finalize,/Valid event date required/);
 assert.match(finalize,/Valid bill date required/);
});

test("V5.2 restricts finalization RPC execution",()=>{
 assert.match(finalize,/revoke all on function public\.closed_loop_finalize_draft/i);
 assert.match(finalize,/from PUBLIC,anon,authenticated,service_role/i);
 assert.match(finalize,/grant execute on function public\.closed_loop_finalize_draft[\s\S]*?to service_role/i);
});
