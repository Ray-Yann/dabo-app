import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const migration=readFileSync("supabase/migrations/2026-10-08-closed-loop-v5-1-persisted-approval.sql","utf8");
const approve=readFileSync("app/api/closed-loop/materialize/route.ts","utf8");
const create=readFileSync("app/api/closed-loop/proposals/route.ts","utf8");
test("V5.1 persists proposal with immutable plan and one version",()=>{
 assert.match(migration,/create table public\.closed_loop_proposals/);
 assert.match(migration,/plan jsonb not null/);
 assert.match(migration,/version integer not null default 1 check\(version=1\)/);
 assert.match(migration,/grant select,insert on public\.closed_loop_proposals to service_role/);
 assert.doesNotMatch(migration,/grant (?:update|delete|all) on public\.closed_loop_proposals to service_role/i);
});
test("V5.1 approves actor-owned same-household proposal atomically",()=>{
 assert.match(migration,/for update/);
 assert.match(migration,/m\.user_id=p_actor_user_id|user_id=p_actor_user_id/);
 assert.match(migration,/id=v_proposal\.created_by/);
 assert.match(migration,/v_proposal\.version<>p_version/);
 assert.match(migration,/closed_loop_materialize_plan\(p_actor_user_id,v_proposal\.household_id,v_proposal\.request_id,v_proposal\.plan\)/);
 assert.match(migration,/v_proposal\.state='executed'/);
});
test("V5.1 rejects legacy client-supplied plan at execution",()=>{
 assert.match(approve,/body\.proposalId/);
 assert.match(approve,/closed_loop_execute_approved_proposal/);
 assert.doesNotMatch(approve,/body\.plan/);
 assert.match(approve,/Object\.keys\(body\)\.some/);
});
test("V5.1 proposal creation requires authenticated active household member and validated plan",()=>{
 assert.match(create,/verifyUserToken/);
 assert.match(create,/\.is\("left_at",null\)/);
 assert.match(create,/validateClosedLoopMaterializationPlan/);
 assert.match(create,/\.insert\(\{household_id:body\.householdId,created_by:member\.id,plan\}\)/);
});
