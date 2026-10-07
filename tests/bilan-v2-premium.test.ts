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


test("Bilan V2.1 gives empty households distinct, human editorial states",()=>{
  assert.match(page,/bilan_v2_evidence_none_confirmed/);
  assert.equal((i18n.match(/bilan_v2_evidence_none_confirmed:/g)||[]).length,7);
  assert.equal((i18n.match(/bilan_v2_state_building_title:/g)||[]).length,7);
  assert.equal((i18n.match(/weekly_report_balance_building:/g)||[]).length,7);
  assert.doesNotMatch(i18n,/bilan_v2_state_building_title: ['"]DABO (?:apprend|is still learning|leert|lernt|todavía|sta ancora|ainda)/i);
});


test("Bilan V2.1.1 keeps zero activity semantically accurate",()=>{
  assert.match(page,/report\.confirmedContributions===0&&intelligentSummary==="building"/);
  assert.match(page,/weekly_report_summary_building_zero_text/);
  assert.equal((i18n.match(/weekly_report_summary_building_zero_text:/g)||[]).length,7);
  assert.match(i18n,/weekly_report_summary_building_zero_text: "À mesure que votre foyer utilise DABO/);
});


test("Bilan V2.1.2 gives zero activity its own accurate title",()=>{
  assert.match(page,/report\.confirmedContributions===0&&intelligentSummary==="building"\?t\("weekly_report_summary_building_zero_title"\)/);
  assert.equal((i18n.match(/weekly_report_summary_building_zero_title:/g)||[]).length,7);
  assert.match(i18n,/weekly_report_summary_building_zero_title: "Votre semaine commence ici"/);
  assert.match(i18n,/weekly_report_summary_building_zero_text: "À mesure que votre foyer utilise DABO/);
});
