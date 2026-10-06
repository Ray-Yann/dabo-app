import assert from "node:assert/strict";
import test from "node:test";
import { computeHouseholdInsightEngine } from "../lib/household-insight-engine";
import type { HouseholdWeeklyReport } from "../lib/household-weekly-report.ts";
import type { HouseholdInsights } from "../lib/household-insights.ts";
import type { FullLoadMap } from "../lib/full-load-map.ts";

function report(overrides: Partial<HouseholdWeeklyReport> = {}): HouseholdWeeklyReport {
  return {
    start: new Date("2026-10-01T00:00:00"), end: new Date("2026-10-08T00:00:00"),
    confirmedContributions: 8, boughtItems: 0, householdEvents: 0, totalPoints: 80,
    memberShares: [], highestShare: 72, balanceLevel: "marked", celebration: "active",
    suggestion: "rebalance", ...overrides,
  };
}
function insights(overrides: Partial<HouseholdInsights> = {}): HouseholdInsights {
  return { trend:"watch", currentCount:8, previousCount:8, currentHighestShare:72,
    previousHighestShare:60, enoughCurrentData:true, enoughComparisonData:true, ...overrides };
}
function load(overrides: Partial<FullLoadMap> = {}): FullLoadMap {
  return { members:[], completedPoints:80, carriedPoints:30, unassignedPoints:0,
    overduePoints:0, unassignedOverduePoints:0, ...overrides };
}

test("stays silent when current evidence is insufficient",()=>{
  const result=computeHouseholdInsightEngine({report:report({confirmedContributions:2}),insights:insights({trend:"building",currentCount:2,enoughCurrentData:false,enoughComparisonData:false}),fullLoadMap:load()});
  assert.equal(result.confidence,"insufficient"); assert.equal(result.state,"building"); assert.equal(result.attention,"none");
});

test("does not claim a trend without a reliable comparison period",()=>{
  const result=computeHouseholdInsightEngine({report:report(),insights:insights({trend:"stable",previousCount:1,previousHighestShare:null,enoughComparisonData:false}),fullLoadMap:load()});
  assert.equal(result.confidence,"observed"); assert.equal(result.state,"steady"); assert.equal(result.canCompare,false);
});

test("surfaces a robust concentration change for review",()=>{
  const result=computeHouseholdInsightEngine({report:report(),insights:insights(),fullLoadMap:load()});
  assert.equal(result.confidence,"robust"); assert.equal(result.state,"watch"); assert.equal(result.attention,"review_distribution");
});

test("a contradictory private perception downgrades the concentration conclusion",()=>{
  const result=computeHouseholdInsightEngine({report:report(),insights:insights(),fullLoadMap:load(),perceptionGap:"perceives_more_balanced"});
  assert.equal(result.hasCounterSignal,true); assert.equal(result.state,"steady"); assert.equal(result.attention,"none");
});

test("overdue registered load takes priority over distribution review",()=>{
  const result=computeHouseholdInsightEngine({report:report(),insights:insights(),fullLoadMap:load({overduePoints:15})});
  assert.equal(result.attention,"review_overdue"); assert.equal(result.evidence.overduePoints,15);
});

test("recognises a robust improvement without claiming causality",()=>{
  const result=computeHouseholdInsightEngine({report:report({balanceLevel:"gentle"}),insights:insights({trend:"improving",currentHighestShare:61,previousHighestShare:70}),fullLoadMap:load()});
  assert.equal(result.state,"improving"); assert.equal(result.confidence,"robust");
});

