import test from "node:test";
import assert from "node:assert/strict";
import { buildHouseholdActionSuggestion, getRebalanceActionState, hasRebalanceInProgress } from "../lib/household-action-suggestions";
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



test("Suggestions V1 reste neutre lorsque plusieurs membres partagent la contribution la plus faible",()=>{
 const tiedMembers=[
  ...members,
  { id:"c", first_name:"C", rotation_order:2, created_at:"2026-01-01" },
 ] as Member[];
 const tiedReport={
  ...baseReport,
  memberShares:[
   {memberId:"a",firstName:"A",points:20,percentage:20},
   {memberId:"b",firstName:"B",points:60,percentage:60},
   {memberId:"c",firstName:"C",points:20,percentage:20},
  ],
 } as HouseholdWeeklyReport;
 assert.equal(
  buildHouseholdActionSuggestion({
   report:tiedReport,
   members:tiedMembers,
   tasks:[task()],
   today:"2026-09-16",
  }),
  null
 );
});

const accepted=(patch:Record<string,unknown>={})=>({id:"s1",household_id:"h",task_id:"planned",suggested_member_id:"a",previous_assigned_to:"b",reason:"rebalance",accepted_at:"2026-09-16T08:00:00Z",...patch} as any);

test("Suggestions V1.2 ne confond pas une attribution ordinaire avec une correction DABO",()=>{
 const planned=task({id:"planned",assigned_to:"a",name:"Vitres",due_date:"2026-09-18"});
 const result=buildHouseholdActionSuggestion({report:baseReport,members,tasks:[planned,task({id:"fresh"})],today:"2026-09-16",acceptedActions:[]});
 assert.equal(hasRebalanceInProgress({report:baseReport,members,tasks:[planned],acceptedActions:[]}),false);
 assert.equal(result?.taskId,"fresh");
});

test("Suggestions V1.2 attend lorsqu une vraie suggestion DABO acceptee est encore en cours",()=>{
 const planned=task({id:"planned",assigned_to:"a",name:"Vitres"});
 const input={report:baseReport,members,tasks:[planned,task({id:"fresh"})],acceptedActions:[accepted()]};
 assert.equal(getRebalanceActionState(input),"in_progress");
 assert.equal(hasRebalanceInProgress(input),true);
 assert.equal(buildHouseholdActionSuggestion({...input,today:"2026-09-16"}),null);
});

test("Suggestions V1.2 attend la confirmation apres execution au lieu de revendiquer un impact",()=>{
 const done=task({id:"planned",assigned_to:"a",status:"done",completed_at:"2026-09-16T09:00:00Z"});
 const contribution={id:"c1",task_id:"planned",household_id:"h",completed_at:"2026-09-16T09:00:00Z",duration_key:null,effort_level:null,weight_points:20,performer_status:"unknown",cancelled_at:null} as any;
 const input={report:baseReport,members,tasks:[done],acceptedActions:[accepted()],contributions:[contribution]};
 assert.equal(getRebalanceActionState(input),"awaiting_confirmation");
 assert.equal(hasRebalanceInProgress(input),true);
});

test("Suggestions V1.2 mesure seulement une contribution confirmee",()=>{
 const done=task({id:"planned",assigned_to:"a",status:"done",completed_at:"2026-09-16T09:00:00Z"});
 const contribution={id:"c1",task_id:"planned",household_id:"h",completed_at:"2026-09-16T09:00:00Z",duration_key:null,effort_level:null,weight_points:20,performer_status:"confirmed",cancelled_at:null} as any;
 assert.equal(getRebalanceActionState({report:baseReport,members,tasks:[done],acceptedActions:[accepted()],contributions:[contribution]}),"measured");
});

test("Suggestions V1.2 libere le moteur si la tache acceptee est reattribuee ou supprimee",()=>{
 const moved=task({id:"planned",assigned_to:"b"});
 assert.equal(getRebalanceActionState({report:baseReport,members,tasks:[moved],acceptedActions:[accepted()]}),"released");
 assert.equal(getRebalanceActionState({report:baseReport,members,tasks:[],acceptedActions:[accepted()]}),"released");
});
