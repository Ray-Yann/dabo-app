import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildTodayHouseholdIntelligenceCandidate } from "../lib/today-household-intelligence";

const insights = (overrides: any = {}) => ({
  trend: "watch",
  currentCount: 19,
  previousCount: 13,
  currentHighestShare: 70,
  previousHighestShare: 50,
  enoughCurrentData: true,
  enoughComparisonData: true,
  ...overrides,
});

test("Aujourd’hui Intelligence V1 fait remonter au maximum un repère foyer quand la concentration augmente", () => {
  const candidate = buildTodayHouseholdIntelligenceCandidate({ householdId: "home-1", insights: insights() });
  if (!candidate) throw new Error("expected household intelligence candidate");
  assert.equal(candidate.householdId, "home-1");
  assert.equal(candidate.source, "balance");
  assert.equal(candidate.level, "suggestion");
  assert.equal(candidate.type, "household.weekly_watch");
});

test("Aujourd’hui Intelligence V1 choisit le silence quand le foyer s’améliore ou reste stable", () => {
  assert.equal(buildTodayHouseholdIntelligenceCandidate({ householdId: "home-1", insights: insights({ trend: "improving" }) }), null);
  assert.equal(buildTodayHouseholdIntelligenceCandidate({ householdId: "home-1", insights: insights({ trend: "stable" }) }), null);
});

test("Aujourd’hui Intelligence V1 ne parle pas sans comparaison suffisante", () => {
  assert.equal(buildTodayHouseholdIntelligenceCandidate({ householdId: "home-1", insights: insights({ enoughComparisonData: false }) }), null);
});

test("Aujourd’hui Intelligence V1 reste sous les urgences existantes et ouvre le Bilan", () => {
  const source = readFileSync("app/app/page.tsx", "utf8");
  assert.match(source, /todayHouseholdIntelligence/);
  assert.match(source, /router\.push\("\/app\/bilan"\)/);
  const engine = readFileSync("lib/today-household-intelligence.ts", "utf8");
  assert.match(engine, /level: "suggestion"/);
  assert.doesNotMatch(engine, /supabase|openai|anthropic|fetch\s*\(/i);
});

