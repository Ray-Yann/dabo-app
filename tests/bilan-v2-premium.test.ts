import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const page=fs.readFileSync("app/app/bilan/page.tsx","utf8");
const i18n=fs.readFileSync("lib/i18n.ts","utf8");

test("Bilan V2 uses the conservative insight engine and keeps evidence explainable",()=>{
  assert.match(page,/computeHouseholdInsightEngine/);
  assert.match(page,/bilan_v2_why/);
  assert.match(page,/bilan_v2_counter_signal/);
  assert.match(page,/bilan_v2_evidence_note/);
});

test("Bilan V2 moves analytical tools behind progressive disclosure",()=>{
  assert.match(page,/bilan_v2_details_title/);
  assert.match(page,/<details className="rounded-2xl/);
  assert.match(page,/household_scenario_title/);
  assert.match(page,/perception_gap_title/);
});

test("Bilan V2 removes duplicate recognition and legacy insight cards from the main reading flow",()=>{
  assert.doesNotMatch(page,/t\("weekly_report_recognition"\)/);
  assert.doesNotMatch(page,/t\("insights_title"\)/);
});

test("Bilan V2 ships its premium copy in all seven catalogues",()=>{
  assert.equal((i18n.match(/bilan_v2_changed_label:/g)||[]).length,7);
  assert.equal((i18n.match(/bilan_v2_evidence_note:/g)||[]).length,7);
  assert.equal((i18n.match(/bilan_v2_details_title:/g)||[]).length,7);
});
