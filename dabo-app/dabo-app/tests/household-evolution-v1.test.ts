import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeHouseholdInsights } from "../lib/household-insights";

const members = [
  { id: "a", rotation_order: 0, created_at: "2026-01-01T00:00:00Z" },
  { id: "b", rotation_order: 1, created_at: "2026-01-01T00:00:00Z" },
] as any;
const c=(id:string,date:string)=>({id,task_id:id,household_id:"h",completed_at:`${date}T12:00:00Z`,duration_key:null,effort_level:null,weight_points:10,performer_status:"confirmed",cancelled_at:null} as any);
const p=(contribution_id:string,member_id:string)=>({contribution_id,member_id,share_weight:1});

test("Évolution V1 reste explicite quand la comparaison manque de données",()=>{
  const rows=[c("1","2026-09-08"),c("2","2026-09-09"),c("3","2026-09-10"),c("4","2026-09-11")];
  const result=computeHouseholdInsights(members,rows,rows.map(row=>p(row.id,"a")),new Date("2026-09-11T12:00:00"));
  assert.equal(result.enoughCurrentData,true);
  assert.equal(result.enoughComparisonData,false);
  assert.equal(result.trend,"stable");
});

test("Évolution V1 reconnaît une amélioration observée sans l'attribuer à une suggestion",()=>{
  const rows=[c("p1","2026-09-01"),c("p2","2026-09-02"),c("p3","2026-09-03"),c("p4","2026-09-04"),c("c1","2026-09-08"),c("c2","2026-09-09"),c("c3","2026-09-10"),c("c4","2026-09-11")];
  const ps=[p("p1","a"),p("p2","a"),p("p3","a"),p("p4","b"),p("c1","a"),p("c2","a"),p("c3","b"),p("c4","b")];
  assert.equal(computeHouseholdInsights(members,rows,ps,new Date("2026-09-11T12:00:00")).trend,"improving");
  const page=readFileSync(new URL("../app/app/bilan/page.tsx",import.meta.url),"utf8");
  assert.match(page,/computeHouseholdInsights/);
  assert.doesNotMatch(page,/suggestion.*(?:cause|causé|provoqu|grâce à)/i);
});

test("Évolution V1 réutilise Insights sans nouvelle persistance Supabase",()=>{
  const page=readFileSync(new URL("../app/app/bilan/page.tsx",import.meta.url),"utf8");
  assert.match(page,/insights_title/);
  assert.match(page,/insights_previous_value/);
  assert.doesNotMatch(page,/from\("household_evolution"\)/);
});
