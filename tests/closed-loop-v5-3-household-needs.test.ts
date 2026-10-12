import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const page = fs.readFileSync(
  path.join(root, "app/app/foyer/besoins/page.tsx"),
  "utf8"
);
const foyer = fs.readFileSync(
  path.join(root, "app/app/foyer/page.tsx"),
  "utf8"
);
const i18n = fs.readFileSync(
  path.join(root, "lib/i18n.ts"),
  "utf8"
);

test("V5.3 rend les besoins accessibles depuis Mon foyer", () => {
  assert.match(foyer, /router\.push\("\/app\/foyer\/besoins"\)/);
  assert.match(foyer, /household_needs_title/);
  assert.match(foyer, /household_needs_description/);
});

test("V5.3 isole les lectures par foyer", () => {
  assert.match(page, /\.from\("household_needs"\)/);
  assert.match(page, /\.from\("household_need_actions"\)/);
  assert.match(page, /sequence !== requestSequence\.current/);
  assert.match(page, /activeHouseholdId\.current !== id/);
  assert.match(page, /snapshot\?\.householdId === household\.id/);

  const filters = page.match(/\.eq\("household_id", id\)/g) ?? [];
  assert.ok(filters.length >= 7, "Les lectures doivent rester limitées au foyer actif");
});

test("V5.3 invalide les anciens chargements au changement de foyer", () => {
  assert.match(
    page,
    /return \(\) => \{\s*requestSequence\.current \+= 1;\s*\};/
  );
  assert.match(page, /setBusy\(false\)/);
  assert.match(page, /setError\(null\)/);
});

test("V5.3 protège la confirmation humaine", () => {
  assert.match(page, /confirmationLock\.current/);
  assert.match(page, /snapshot\?\.householdId === currentHouseholdId/);
  assert.match(page, /need\.status === "awaiting_confirmation"/);
  assert.match(page, /supabase\.rpc\(\s*"closed_loop_confirm_need"/);
  assert.match(page, /p_need_id: needId/);
  assert.doesNotMatch(
    page,
    /\.from\("household_needs"\)\s*\.update\(/
  );
});

test("V5.3 ne confond pas planification et réalisation", () => {
  assert.match(page, /action\.resource_type === "calendar_event"/);
  assert.match(page, /household_needs_planned_only/);
  assert.match(page, /resource\?\.status === "done"/);
  assert.match(page, /resource\?\.status === "bought"/);
  assert.match(page, /resource\?\.status === "paid"/);
  assert.match(page, /resource\?\.status === "posted"/);
});

test("V5.3 protège les ressources financières privées", () => {
  const visibilityFilters =
    page.match(/\.eq\("visibility", "household"\)/g) ?? [];

  assert.equal(visibilityFilters.length, 2);
  assert.match(page, /finance_bill/);
  assert.match(page, /finance_transaction/);
});

test("V5.3 dispose des 35 traductions dans les sept langues", () => {
  const keys = [
    "title", "description",
    "status_open", "status_in_progress",
    "status_awaiting_confirmation", "status_resolved",
    "status_cancelled", "back", "eyebrow", "refresh",
    "empty", "actions", "required", "planning",
    "done", "pending", "planned_only", "date",
    "confirm", "confirming", "awaiting_message",
    "resolved_on", "load_error", "confirm_error",
    "resource_task", "resource_shopping",
    "resource_calendar", "resource_bill",
    "resource_transaction", "resource_human",
    "intro", "count_one", "count_many",
    "empty_hint", "resource_generic",
  ];

  assert.equal(keys.length, 35);

  for (const suffix of keys) {
    const key = `household_needs_${suffix}`;
    const matches = i18n.match(new RegExp(`\\b${key}:`, "g")) ?? [];

    assert.equal(matches.length, 7, `${key} doit exister dans les sept langues`);
  }
});