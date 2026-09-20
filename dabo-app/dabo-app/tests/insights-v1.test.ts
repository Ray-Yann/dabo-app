import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeHouseholdInsights } from "../lib/household-insights";

const members = [
  { id: "a", rotation_order: 0, created_at: "2026-01-01T00:00:00Z" },
  { id: "b", rotation_order: 1, created_at: "2026-01-01T00:00:00Z" },
] as any;

function contribution(id: string, date: string, points = 10) {
  return { id, task_id: id, household_id: "h", completed_at: `${date}T12:00:00Z`, duration_key: null, effort_level: null, weight_points: points, performer_status: "confirmed", cancelled_at: null } as any;
}
function participant(contribution_id: string, member_id: string) {
  return { contribution_id, member_id, share_weight: 1 };
}

test("Insights V1 reste silencieux tant que les données sont insuffisantes", () => {
  const rows = [contribution("1", "2026-09-09"), contribution("2", "2026-09-10")];
  const result = computeHouseholdInsights(members, rows, rows.map((r) => participant(r.id, "a")), new Date("2026-09-11T12:00:00"));
  assert.equal(result.trend, "building");
  assert.equal(result.enoughCurrentData, false);
});

test("Insights V1 compare deux fenêtres de sept jours sans mélanger les périodes", () => {
  const rows = [
    contribution("p1", "2026-09-01"), contribution("p2", "2026-09-02"), contribution("p3", "2026-09-03"), contribution("p4", "2026-09-04"),
    contribution("c1", "2026-09-08"), contribution("c2", "2026-09-09"), contribution("c3", "2026-09-10"), contribution("c4", "2026-09-11"),
  ];
  const ps = [participant("p1","a"),participant("p2","a"),participant("p3","a"),participant("p4","b"),participant("c1","a"),participant("c2","a"),participant("c3","b"),participant("c4","b")];
  const result = computeHouseholdInsights(members, rows, ps, new Date("2026-09-11T12:00:00"));
  assert.equal(result.previousCount, 4);
  assert.equal(result.currentCount, 4);
  assert.equal(result.previousHighestShare, 75);
  assert.equal(result.currentHighestShare, 50);
  assert.equal(result.trend, "improving");
});

test("Insights V1 qualifie une concentration croissante sans produire d'alerte punitive", () => {
  const rows = [
    contribution("p1", "2026-09-01"), contribution("p2", "2026-09-02"), contribution("p3", "2026-09-03"), contribution("p4", "2026-09-04"),
    contribution("c1", "2026-09-08"), contribution("c2", "2026-09-09"), contribution("c3", "2026-09-10"), contribution("c4", "2026-09-11"),
  ];
  const ps = [participant("p1","a"),participant("p2","a"),participant("p3","b"),participant("p4","b"),participant("c1","a"),participant("c2","a"),participant("c3","a"),participant("c4","b")];
  const result = computeHouseholdInsights(members, rows, ps, new Date("2026-09-11T12:00:00"));
  assert.equal(result.trend, "watch");
  const source = readFileSync(new URL("../lib/i18n.ts", import.meta.url), "utf8");
  assert.match(source, /C’est un repère, pas une alerte/);
});

test("Insights V1 s'intègre à Équilibre sans nouvelle table Supabase", () => {
  const page = readFileSync(new URL("../app/app/equilibre/page.tsx", import.meta.url), "utf8");
  assert.match(page, /\["overview", "contributions", "redistribute", "insights"\]/);
  assert.match(page, /computeHouseholdInsights/);
  assert.doesNotMatch(page, /from\("household_insights"\)/);
});
