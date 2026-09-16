import test from "node:test";
import assert from "node:assert/strict";
import { buildHouseholdActionSuggestion } from "../lib/household-action-suggestions";
import type { HouseholdWeeklyReport } from "../lib/household-weekly-report.ts";
import type { Member, Task } from "../lib/types.ts";

const members = [
  { id:"a", first_name:"A", rotation_order:0, created_at:"2026-01-01" },
  { id:"b", first_name:"B", rotation_order:1, created_at:"2026-01-01" },
] as Member[];
const baseReport = { suggestion:"rebalance", memberShares:[{memberId:"a",firstName:"A",points:38,percentage:38},{memberId:"b",firstName:"B",points:62,percentage:62}] } as HouseholdWeeklyReport;
const task=(patch:Partial<Task>={})=>({id:"t1",household_id:"h",routine_id:null,name:"Cuisine",weight_points:20,duration_key:null,effort_level:null,assigned_to:"b",status:"pending",urgent:false,due_date:"2026-09-18",completed_at:null,created_at:"2026-09-10",...patch}) as Task;

test("Suggestions V1 propose une tÃ¢che au membre ayant le moins contribuÃ© sans rien modifier",()=>{
 const original=task(); const result=buildHouseholdActionSuggestion({report:baseReport,members,tasks:[original],today:"2026-09-16"});
 assert.equal(result?.suggestedMemberId,"a"); assert.equal(result?.taskId,"t1"); assert.equal(original.assigned_to,"b");
});
test("Suggestions V1 reste silencieux quand le bilan ne recommande pas de rÃ©Ã©quilibrage",()=>{
 const report={...baseReport,suggestion:"none"} as HouseholdWeeklyReport;
 assert.equal(buildHouseholdActionSuggestion({report,members,tasks:[task()],today:"2026-09-16"}),null);
});
test("Suggestions V1 ignore tÃ¢ches terminÃ©es, Ã©chues et dÃ©jÃ  attribuÃ©es au membre proposÃ©",()=>{
 const tasks=[task({id:"done",status:"done"}),task({id:"late",due_date:"2026-09-15"}),task({id:"already",assigned_to:"a"})];
 assert.equal(buildHouseholdActionSuggestion({report:baseReport,members,tasks,today:"2026-09-16"}),null);
});
test("Suggestions V1 privilÃ©gie une tÃ¢che non attribuÃ©e avant une rÃ©attribution",()=>{
 const result=buildHouseholdActionSuggestion({report:baseReport,members,tasks:[task({id:"assigned"}),task({id:"free",assigned_to:null,name:"Courses"})],today:"2026-09-16"});
 assert.equal(result?.taskId,"free");
});
