import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const adminRoute = fs.readFileSync("app/api/admin/loba/route.ts", "utf8");
const householdRoute = fs.readFileSync("app/api/loba/household/route.ts", "utf8");
const usageHelper = fs.readFileSync("lib/loba-usage.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/2026-09-21-loba-usage-v1.sql", "utf8");

test("LOBA P0.3 centralise la persistance de consommation IA", () => {
  assert.match(usageHelper, /export async function recordLobaUsage/);
  assert.match(usageHelper, /\.from\("loba_ai_usage"\)/);
  assert.match(usageHelper, /prompt_tokens:/);
  assert.match(usageHelper, /completion_tokens:/);
  assert.match(usageHelper, /total_tokens:/);
  assert.match(usageHelper, /persistence failed/);
  assert.match(usageHelper, /persistence exception/);
});

test("LOBA P0.3 instrumente les appels IA Admin", () => {
  assert.match(adminRoute, /recordLobaUsage/);
  assert.match(adminRoute, /surface: "admin"/);
  assert.match(adminRoute, /status: "success"/);
  assert.match(adminRoute, /status: "provider_error"/);
  assert.match(adminRoute, /status: "empty_response"/);
  assert.match(adminRoute, /status: "request_error"/);
  assert.match(adminRoute, /usage: data\.usage/);
  assert.match(adminRoute, /userId: admin\.id/);
});

test("LOBA P0.3 instrumente les appels IA Foyer", () => {
  assert.match(householdRoute, /recordLobaUsage/);
  assert.match(householdRoute, /surface:"household"/);
  assert.match(householdRoute, /status:"success"/);
  assert.match(householdRoute, /status:"provider_error"/);
  assert.match(householdRoute, /status:"empty_response"/);
  assert.match(householdRoute, /status:"request_error"/);
  assert.match(householdRoute, /usage:data\.usage/);
  assert.match(householdRoute, /userId:user\.id/);
  assert.match(householdRoute, /householdId/);
  assert.match(householdRoute, /domain/);
});

test("LOBA P0.3 ne persiste aucun contenu conversationnel ou contexte du foyer", () => {
  const insertStart = usageHelper.indexOf(".insert({");
  assert.notEqual(insertStart, -1);

  const insertEnd = usageHelper.indexOf("});", insertStart);
  assert.notEqual(insertEnd, -1);

  const persistedPayload = usageHelper.slice(insertStart, insertEnd);

  assert.doesNotMatch(persistedPayload, /question/i);
  assert.doesNotMatch(persistedPayload, /prompt(?!_tokens)/i);
  assert.doesNotMatch(persistedPayload, /answer/i);
  assert.doesNotMatch(persistedPayload, /context/i);
  assert.doesNotMatch(persistedPayload, /history/i);
  assert.doesNotMatch(persistedPayload, /message/i);
});

test("LOBA P0.3 protège la télémétrie derrière service_role", () => {
  assert.match(migration, /alter table public\.loba_ai_usage enable row level security/);
  assert.match(migration, /grant select, insert on table public\.loba_ai_usage to service_role/);
  assert.doesNotMatch(migration, /grant[^;]*(anon|authenticated)/i);
  assert.doesNotMatch(migration, /create policy/i);
});


test("LOBA P0.3 calcule le coût canonique du modèle connu", async () => {
  const { calculateLobaUsageCost } = await import("../lib/loba-usage");

  const cost = calculateLobaUsageCost("openai/gpt-oss-120b", {
    prompt_tokens: 4000,
    completion_tokens: 500,
    total_tokens: 4500,
  });

  assert.ok(cost);
  assert.equal(cost.inputPricePerMillionUsd, 0.15);
  assert.equal(cost.outputPricePerMillionUsd, 0.6);
  assert.equal(cost.inputCostUsd, 0.0006);
  assert.equal(cost.outputCostUsd, 0.0003);
  assert.ok(Math.abs(cost.totalCostUsd - 0.0009) < 1e-12);
});

test("LOBA P0.3 ne fabrique aucun coût pour un modèle inconnu", async () => {
  const { calculateLobaUsageCost } = await import("../lib/loba-usage");

  const cost = calculateLobaUsageCost("future/unknown-model", {
    prompt_tokens: 4000,
    completion_tokens: 500,
    total_tokens: 4500,
  });

  assert.equal(cost, null);
});

test("LOBA P0.3 ne fabrique aucun coût si les compteurs nécessaires manquent", async () => {
  const { calculateLobaUsageCost } = await import("../lib/loba-usage");

  assert.equal(
    calculateLobaUsageCost("openai/gpt-oss-120b", {
      prompt_tokens: 4000,
    }),
    null
  );

  assert.equal(
    calculateLobaUsageCost("openai/gpt-oss-120b", null),
    null
  );
});

test("LOBA P0.3 persiste le snapshot tarifaire et les coûts", () => {
  assert.match(usageHelper, /input_price_per_million_usd/);
  assert.match(usageHelper, /output_price_per_million_usd/);
  assert.match(usageHelper, /input_cost_usd/);
  assert.match(usageHelper, /output_cost_usd/);
  assert.match(usageHelper, /total_cost_usd/);

  assert.match(migration, /input_price_per_million_usd numeric/);
  assert.match(migration, /output_price_per_million_usd numeric/);
  assert.match(migration, /input_cost_usd numeric/);
  assert.match(migration, /output_cost_usd numeric/);
  assert.match(migration, /total_cost_usd numeric/);
});


test("LOBA P0.3 expose une observabilite fiable dans le cockpit Admin", () => {
  const dashboardRoute = fs.readFileSync(
    "app/api/admin/dashboard/route.ts",
    "utf8"
  );
  const adminPage = fs.readFileSync("app/admin/page.tsx", "utf8");

  assert.match(dashboardRoute, /\.from\("loba_ai_usage"\)/);
  assert.match(dashboardRoute, /\.gte\("created_at", since30\)/);
  assert.match(dashboardRoute, /\.range\(from, from \+ pageSize - 1\)/);
  assert.match(dashboardRoute, /if \(page\.length < pageSize\) break/);
  assert.match(dashboardRoute, /lobaUsageRows\.push\(\.\.\.page\)/);

  assert.match(dashboardRoute, /lobaUsageRows = \[\]/);
  assert.match(dashboardRoute, /available: false/);
  assert.match(dashboardRoute, /surfacesLast30Days/);

  assert.match(
    dashboardRoute,
    /row\.total_tokens \?\?[\s\S]*?row\.prompt_tokens \?\? 0[\s\S]*?row\.completion_tokens \?\? 0/
  );

  assert.match(adminPage, /usage\?:LobaUsageData/);
  assert.match(adminPage, /data\.loba\?\.usage\?\.available/);
  assert.match(adminPage, /surfacesLast30Days\.admin/);
  assert.match(adminPage, /surfacesLast30Days\.household/);
  assert.match(adminPage, /pricedCalls<data\.loba\.usage\.last30Days\.calls/);
});

test("LOBA P0.3 ne lit aucun contenu conversationnel pour le cockpit Admin", () => {
  const dashboardRoute = fs.readFileSync(
    "app/api/admin/dashboard/route.ts",
    "utf8"
  );

  const sourceStart = dashboardRoute.indexOf('.from("loba_ai_usage")');
  assert.notEqual(sourceStart, -1);

  const sourceEnd = dashboardRoute.indexOf(
    'const H = sourceAvailability.households',
    sourceStart
  );
  assert.notEqual(sourceEnd, -1);

  const usageQuery = dashboardRoute.slice(sourceStart, sourceEnd);

  assert.doesNotMatch(usageQuery, /question/i);
  assert.doesNotMatch(usageQuery, /answer/i);
  assert.doesNotMatch(usageQuery, /context/i);
  assert.doesNotMatch(usageQuery, /history/i);
  assert.doesNotMatch(usageQuery, /message/i);
  assert.doesNotMatch(usageQuery, /prompt(?!_tokens)/i);
});
