import { readFileSync } from "node:fs";
import test from"node:test";import assert from"node:assert/strict";import fs from"node:fs";import{actionStateFromResource,resolveClosedLoopNeed,type ClosedLoopNeed}from"../lib/closed-loop-engine";import{proposeClosedLoop}from"../lib/closed-loop-reasoning";
const migration=fs.readFileSync("supabase/migrations/2026-10-07-closed-loop-v1.sql","utf8");
const base=(over:Partial<ClosedLoopNeed>={}):ClosedLoopNeed=>({id:"n",title:"Ampoule",status:"open",resolutionMode:"deterministic",actions:[],...over});
test("Closed Loop never resolves an empty need",()=>assert.equal(resolveClosedLoopNeed(base()).resolved,false));
test("Closed Loop deterministically resolves a bought shopping need",()=>{const r=resolveClosedLoopNeed(base({actions:[{id:"a",resourceType:"shopping_item",resourceId:"i",role:"resolves",state:"satisfied",position:0}]}));assert.equal(r.status,"resolved")});
test("Closed Loop never resolves deterministic evidence without a resolution condition",()=>{const r=resolveClosedLoopNeed(base({actions:[{id:"a",resourceType:"calendar_event",resourceId:"e",role:"evidence",state:"satisfied",position:0}]}));assert.equal(r.status,"open");assert.equal(r.resolved,false);assert.equal(r.reason,"no_actions")});

test("Closed Loop keeps buy then do open until every required action is satisfied",()=>{const r=resolveClosedLoopNeed(base({actions:[{id:"a",resourceType:"shopping_item",resourceId:"i",role:"required",state:"satisfied",position:0},{id:"b",resourceType:"task",resourceId:"t",role:"required",state:"pending",position:1}]}));assert.equal(r.status,"in_progress");assert.equal(r.remainingRequired,1)});
test("Closed Loop requires explicit human truth when reality cannot be inferred",()=>{const r=resolveClosedLoopNeed(base({resolutionMode:"human_required",actions:[{id:"a",resourceType:"task",resourceId:"t",role:"required",state:"satisfied",position:0},{id:"c",resourceType:"human_confirmation",resourceId:null,role:"resolves",state:"pending",position:1}]}));assert.equal(r.status,"awaiting_confirmation");assert.equal(r.resolved,false)});
test("calendar presence is never treated as real-world resolution",()=>assert.equal(actionStateFromResource("calendar_event",{status:"done"}),"pending"));
test("reasoning proposes but always requires approval",()=>{const p=proposeClosedLoop("Acheter une ampoule puis remplacer l'ampoule");assert.ok(p);assert.equal(p?.requiresApproval,true);assert.equal(p?.actions.length,3);assert.equal(p?.resolutionMode,"human_required")});
test("migration protects household isolation and does not grant anon",()=>{assert.match(migration,/enable row level security/g);assert.match(migration,/revoke all on public\.household_needs from anon/);assert.match(migration,/closed_loop_guard_action_household/);assert.match(migration,/human_confirmed_at is null or resource_type='human_confirmation'/);assert.match(migration,/not \(resolved_at is not null and cancelled_at is not null\)/);assert.match(migration,/creator\.household_id=household_needs\.household_id/);assert.match(migration,/n\.id=need_id[\s\S]*n\.household_id=household_need_actions\.household_id/);assert.doesNotMatch(migration,/grant .* to anon/i)});


test("migration protects resolution truth behind controlled RPCs",()=>{
 const sql=readFileSync("supabase/migrations/2026-10-07-closed-loop-v1.sql","utf8");
 assert.match(sql,/revoke update on table public\.household_needs from authenticated/i);
 assert.match(sql,/grant update \(title\) on table public\.household_needs to authenticated/i);
 assert.match(sql,/revoke update on table public\.household_need_actions from authenticated/i);
 assert.match(sql,/human_confirmed_by uuid references public\.members\(id\)/i);
 assert.match(sql,/closed_loop_refresh_need\(p_need_id uuid\)/i);
 assert.match(sql,/closed_loop_confirm_need\(p_need_id uuid\)/i);
 assert.match(sql,/closed_loop_cancel_need\(p_need_id uuid\)/i);
 assert.match(sql,/for update/i);
 assert.match(sql,/resource_type='calendar_event' then\s*return false/i);
 assert.match(sql,/status='done' and t\.completed_at is not null/i);
 assert.match(sql,/status='bought' and s\.bought_at is not null/i);
 assert.match(sql,/status='paid' and b\.paid_transaction_id is not null/i);
 assert.match(sql,/status='posted'/i);
 assert.match(sql,/CLOSED_LOOP_RESOURCE_INVALID/i);
 assert.match(sql,/human_confirmed_at is null\)\=\(human_confirmed_by is null/i);
});

test("migration can reopen derived truth when a resource is undone",()=>{
 const sql=readFileSync("supabase/migrations/2026-10-07-closed-loop-v1.sql","utf8");
 assert.match(sql,/resolved_at=case when v_new_status='resolved'[\s\S]*else null end/i);
 assert.match(sql,/v_remaining_required>0/i);
 assert.match(sql,/closed_loop_resource_satisfied/i);
});


test("migration prevents clients from rewriting the resolution graph",()=>{
 const sql=readFileSync("supabase/migrations/2026-10-07-closed-loop-v1.sql","utf8");
 assert.match(sql,/revoke delete on table public\.household_needs from authenticated/i);
 assert.match(sql,/revoke delete on table public\.household_need_actions from authenticated/i);
 assert.match(sql,/grant update \(position\) on table public\.household_need_actions to authenticated/i);
 assert.doesNotMatch(sql,/grant update \(role,position\)/i);
});

test("migration invalidates stale human confirmation when required reality reopens",()=>{
 const sql=readFileSync("supabase/migrations/2026-10-07-closed-loop-v1.sql","utf8");
 assert.match(sql,/v_remaining_required>0[\s\S]*human_confirmed_at=null[\s\S]*human_confirmed_by=null/i);
 assert.match(sql,/v_confirmation_satisfied := false/i);
});

