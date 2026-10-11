import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const route=readFileSync(
 "app/api/closed-loop/finalize-draft/route.ts","utf8"
);

test("V5.2 requires authentication",()=>{
 assert.match(route,/verifyUserToken\(token\)/);
 assert.match(route,/status:401/);
});

test("V5.2 limits request body size",()=>{
 assert.match(route,/readClosedLoopJson\(req\)/);
 assert.match(route,/ClosedLoopRequestError/);
 assert.match(route,/status===413/);
 assert.doesNotMatch(route,/req\.json\(\)/);
});

test("V5.2 validates draft identifiers",()=>{
 assert.match(route,/uuid\(body\.draftId\)/);
 assert.match(route,/Brouillon invalide/);
});

test("V5.2 rejects unexpected request fields",()=>{
 assert.match(route,/Object\.keys\(body\)\.some/);
 assert.match(route,/\["draftId","details"\]/);
});

test("V5.2 limits and validates action details",()=>{
 assert.match(route,/entries\.length>20/);
 assert.match(route,/Number\(position\)>19/);
 assert.match(route,/\["eventDate","dueOn"\]/);
});

test("V5.2 validates real calendar dates",()=>{
 assert.match(route,/new Date\(/);
 assert.match(route,/toISOString\(\)\.slice\(0,10\)===x/);
});

test("V5.2 finalizes through the server RPC",()=>{
 assert.match(route,/createAdminClient\(\)/);
 assert.match(route,/db\.rpc\("closed_loop_finalize_draft"/);
 assert.match(route,/p_actor_user_id:user\.id/);
 assert.match(route,/p_draft_id:body\.draftId/);
 assert.match(route,/p_details:details/);
});

test("V5.2 does not materialize household actions directly",()=>{
 assert.doesNotMatch(route,/closed_loop_execute_approved_proposal/);
 assert.doesNotMatch(route,/closed_loop_materialize_plan/);
 assert.doesNotMatch(route,/\.from\("(tasks|shopping_items|finance_bills|calendar_events)"\)/);
});
