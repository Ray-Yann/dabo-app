import test from"node:test";import assert from"node:assert/strict";import fs from"node:fs";
import{actionStateFromResource}from"../lib/closed-loop-engine";
const sql=fs.readFileSync("supabase/migrations/2026-10-07-closed-loop-v2-operational-wiring.sql","utf8");

test("Closed Loop V2 aligns pure finance truth with database truth",()=>{
 assert.equal(actionStateFromResource("finance_bill",{status:"paid",paid_transaction_id:"tx"}),"satisfied");
 assert.equal(actionStateFromResource("finance_bill",{status:"paid",paid_transaction_id:null}),"pending");
 assert.equal(actionStateFromResource("finance_transaction",{status:"posted"}),"satisfied");
 assert.equal(actionStateFromResource("finance_transaction",{status:"void"}),"pending");
});

test("Closed Loop V4.2 requires complete task and shopping truth",()=>{
 assert.equal(actionStateFromResource("task",{status:"done",completed_at:"2026-10-07T12:00:00Z"}),"satisfied");
 assert.equal(actionStateFromResource("task",{status:"done",completed_at:null}),"pending");
 assert.equal(actionStateFromResource("task",{status:"pending",completed_at:"2026-10-07T12:00:00Z"}),"pending");
 assert.equal(actionStateFromResource("shopping_item",{status:"bought",bought_at:"2026-10-07T12:00:00Z"}),"satisfied");
 assert.equal(actionStateFromResource("shopping_item",{status:"bought",bought_at:null}),"pending");
 assert.equal(actionStateFromResource("shopping_item",{status:"to_buy",bought_at:"2026-10-07T12:00:00Z"}),"pending");
});
test("Closed Loop V2 wires task and shopping truth changes automatically",()=>{
 assert.match(sql,/after update of status,completed_at or delete on public\.tasks/i);
 assert.match(sql,/closed_loop_refresh_from_resource\('task'\)/i);
 assert.match(sql,/after update of status,bought_at or delete on public\.shopping_items/i);
 assert.match(sql,/closed_loop_refresh_from_resource\('shopping_item'\)/i);
});

test("Closed Loop V2 wires finance truth changes and reversals automatically",()=>{
 assert.match(sql,/after update of status,paid_transaction_id or delete on public\.finance_bills/i);
 assert.match(sql,/closed_loop_refresh_from_resource\('finance_bill'\)/i);
 assert.match(sql,/after update of status or delete on public\.finance_transactions/i);
 assert.match(sql,/closed_loop_refresh_from_resource\('finance_transaction'\)/i);
 assert.match(sql,/resolved_at=case when v_new_status='resolved'[\s\S]*else null end/i);
});

test("Closed Loop V2 keeps calendar as planning evidence, not resolution proof",()=>{
 assert.match(sql,/p_resource_type='calendar_event' then\s*return false/i);
 assert.match(sql,/after delete on public\.calendar_events/i);
 assert.match(sql,/closed_loop_refresh_from_resource\('calendar_event'\)/i);
});

test("Closed Loop V2 refreshes immediately when an action is linked",()=>{
 assert.match(sql,/after insert on public\.household_need_actions/i);
 assert.match(sql,/perform public\.closed_loop_refresh_need_system\(new\.need_id\)/i);
});

test("Closed Loop V2 internal refresh is not callable by clients",()=>{
 assert.match(sql,/security definer[\s\S]*closed_loop_refresh_need_system|closed_loop_refresh_need_system[\s\S]*security definer/i);
 assert.match(sql,/revoke all on function public\.closed_loop_refresh_need_system\(uuid\) from authenticated/i);
 assert.match(sql,/revoke all on function public\.closed_loop_refresh_from_resource\(\) from authenticated/i);
 assert.match(sql,/revoke all on function public\.closed_loop_refresh_from_action_insert\(\) from authenticated/i);
});

test("Closed Loop V2 public refresh remains authenticated and household-scoped",()=>{
 assert.match(sql,/auth\.uid\(\) is null[\s\S]*AUTH_REQUIRED/i);
 assert.match(sql,/m\.household_id=v_household_id[\s\S]*m\.user_id=auth\.uid\(\)[\s\S]*m\.left_at is null/i);
 assert.match(sql,/grant execute on function public\.closed_loop_refresh_need\(uuid\) to authenticated/i);
});

test("Closed Loop V2 refuses private resources in the shared need graph",()=>{
 assert.match(sql,/CLOSED_LOOP_PRIVATE_RESOURCE_ALREADY_LINKED/i);
 assert.match(sql,/calendar_events r[\s\S]*r\.visibility='household'/i);
 assert.match(sql,/finance_bills r[\s\S]*r\.visibility='household'/i);
 assert.match(sql,/finance_transactions r[\s\S]*r\.visibility='household'/i);
});
