import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeHouseholdRecognition } from "../lib/household-recognition";

const report=(overrides:any={})=>({confirmedContributions:8,balanceLevel:"gentle",memberShares:[{memberId:"a",points:55},{memberId:"b",points:45}],...overrides} as any);
const insights=(overrides:any={})=>({trend:"stable",enoughComparisonData:true,...overrides} as any);

test("Reconnaissance V1 attend assez de données avant de valoriser une dynamique",()=>{
  assert.equal(computeHouseholdRecognition(report({confirmedContributions:3}),insights()),"building");
});

test("Reconnaissance V1 valorise une amélioration observée avant tout autre signal positif",()=>{
  assert.equal(computeHouseholdRecognition(report({balanceLevel:"marked"}),insights({trend:"improving"})),"improving");
});

test("Reconnaissance V1 reconnaît un équilibre sain sans classement",()=>{
  assert.equal(computeHouseholdRecognition(report({balanceLevel:"healthy"}),insights()),"balanced");
});

test("Reconnaissance V1 peut reconnaître une participation partagée sans inventer un équilibre",()=>{
  assert.equal(computeHouseholdRecognition(report(),insights()),"shared");
  assert.equal(computeHouseholdRecognition(report({balanceLevel:"marked",memberShares:[{memberId:"a",points:70},{memberId:"b",points:30}]}),insights()),"active");
});

test("Reconnaissance V1 reste descriptive et ne crée ni score ni nouvelle persistance",()=>{
  const page=readFileSync(new URL("../app/app/bilan/page.tsx",import.meta.url),"utf8");
  const engine=readFileSync(new URL("../lib/household-recognition.ts",import.meta.url),"utf8");
  assert.match(page,/computeHouseholdRecognition/);
  assert.match(page,/weekly_report_recognition_note/);
  assert.doesNotMatch(engine,/score|ranking|rank|from\(/i);
  assert.doesNotMatch(page,/household_recognition/);
});
