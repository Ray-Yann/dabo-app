import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeHouseholdIntelligentSummary } from "../lib/household-intelligent-summary";

const report = (overrides: any = {}) => ({ confirmedContributions: 10, balanceLevel: "gentle", memberShares: [], suggestion: "rebalance", ...overrides });
const insights = (overrides: any = {}) => ({ trend: "stable", enoughComparisonData: true, enoughCurrentData: true, currentCount: 10, previousCount: 8, currentHighestShare: 62, previousHighestShare: 60, ...overrides });

test("Synthèse V1 reste prudente quand les données sont insuffisantes", () => {
  assert.equal(computeHouseholdIntelligentSummary(report({ confirmedContributions: 3, balanceLevel: "building" }), insights({ enoughComparisonData: false }), "building"), "building");
});

test("Synthèse V1 met une amélioration observée au premier plan sans causalité", () => {
  assert.equal(computeHouseholdIntelligentSummary(report(), insights({ trend: "improving" }), "improving"), "improving");
});

test("Synthèse V1 relie activité et concentration croissante sans masquer le repère", () => {
  assert.equal(computeHouseholdIntelligentSummary(report({ balanceLevel: "marked" }), insights({ trend: "watch" }), "active"), "watch");
});

test("Synthèse V1 sait raconter un équilibre ou une dynamique partagée", () => {
  assert.equal(computeHouseholdIntelligentSummary(report({ balanceLevel: "healthy" }), insights({ trend: "stable" }), "balanced"), "balanced");
  assert.equal(computeHouseholdIntelligentSummary(report(), insights({ trend: "stable" }), "shared"), "shared");
});

test("Synthèse V1 reste déterministe, sans IA payante ni nouvelle persistance", () => {
  const source = readFileSync("lib/household-intelligent-summary.ts", "utf8");
  assert.doesNotMatch(source, /supabase|openai|anthropic|fetch\s*\(/i);
  assert.doesNotMatch(source, /score|ranking|rank/i);
});
