import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeHouseholdWeeklyReport } from "../lib/household-weekly-report";
const members = [{id:"a",first_name:"A"},{id:"b",first_name:"B"}] as any;
const c=(id:string,day:string,points=10)=>({id,task_id:id,household_id:"h",completed_at:`${day}T12:00:00`,weight_points:points,performer_status:"confirmed",cancelled_at:null}) as any;
const p=(contribution_id:string,member_id:string)=>({contribution_id,member_id,share_weight:1});
test("Bilan V1 reste en construction sous quatre contributions",()=>{const rows=[c("1","2026-09-14"),c("2","2026-09-15")];const r=computeHouseholdWeeklyReport({members,contributions:rows,participants:rows.map(x=>p(x.id,"a")),now:new Date("2026-09-16T12:00:00")});assert.equal(r.balanceLevel,"building");assert.equal(r.suggestion,"none");});
test("Bilan V1 reconnaît une répartition saine sans fabriquer de problème",()=>{const rows=[c("1","2026-09-13"),c("2","2026-09-14"),c("3","2026-09-15"),c("4","2026-09-16")];const ps=[p("1","a"),p("2","a"),p("3","b"),p("4","b")];const r=computeHouseholdWeeklyReport({members,contributions:rows,participants:ps,now:new Date("2026-09-16T12:00:00")});assert.equal(r.balanceLevel,"healthy");assert.equal(r.celebration,"balanced");assert.equal(r.suggestion,"none");});
test("Bilan V1 décrit un écart sans désigner un coupable",()=>{const rows=[c("1","2026-09-13"),c("2","2026-09-14"),c("3","2026-09-15"),c("4","2026-09-16")];const r=computeHouseholdWeeklyReport({members,contributions:rows,participants:rows.map(x=>p(x.id,"a")),now:new Date("2026-09-16T12:00:00")});assert.equal(r.balanceLevel,"marked");assert.equal(r.suggestion,"rebalance");});
test("L'interface Bilan V1 ne contient pas de vocabulaire de classement",()=>{const page=readFileSync(new URL("../app/app/bilan/page.tsx",import.meta.url),"utf8");assert.doesNotMatch(page,/gagnant|perdant|classement|score de couple/i);});


test("Bilan V1 respecte share_weight pour repartir les points d'une contribution", () => {
  const rows = [
    c("1", "2026-09-13", 40),
    c("2", "2026-09-14", 10),
    c("3", "2026-09-15", 10),
    c("4", "2026-09-16", 10),
  ];
  const ps = [
    { contribution_id: "1", member_id: "a", share_weight: 3 },
    { contribution_id: "1", member_id: "b", share_weight: 1 },
    p("2", "b"),
    p("3", "b"),
    p("4", "b"),
  ];
  const r = computeHouseholdWeeklyReport({
    members,
    contributions: rows,
    participants: ps,
    now: new Date("2026-09-16T12:00:00"),
  });

  assert.equal(r.memberShares.find((m) => m.memberId === "a")?.points, 30);
  assert.equal(r.memberShares.find((m) => m.memberId === "b")?.points, 40);
  assert.equal(r.totalPoints, 70);
});
