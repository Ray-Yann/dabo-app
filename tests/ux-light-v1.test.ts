import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path: string) => fs.readFileSync(path, "utf8");

test("UX Light V1 garde Aujourd'hui et Plus fixes avec quatre onglets personnalisables", () => {
  const nav = read("components/DaboMainNav.tsx");
  assert.match(nav, /DEFAULT_TABS: TabKey\[\] = \["tasks", "courses", "calendar", "finances"\]/);
  assert.match(nav, /key: "today"/);
  assert.match(nav, /tab_more/);
  assert.match(nav, /grid-cols-6/);
});

test("UX Light V1 synchronise la navigation par utilisateur", () => {
  const migration = read("supabase-migrations/2026-09-11-ux-light-v1-navigation-preferences.sql");
  assert.match(migration, /user_navigation_preferences/);
  assert.match(migration, /auth\.uid\(\) = user_id/);
  assert.match(migration, /cardinality\(pinned_tabs\) = 4/);
});

test("UX Light V1 fait de Finances une destination principale", () => {
  const route = read("app/app/finances/page.tsx");
  const home = read("app/app/page.tsx");
  assert.match(route, /financeSection/);
  assert.match(home, /\/app\/finances/);
});

test("UX Light V1 allège Équilibre et Finances avec une seule vue sélectionnée", () => {
  const balance = read("app/app/equilibre/page.tsx");
  const finances = read("app/app/finances/page.tsx");
  assert.match(balance, /<select[\s\S]*balanceSection/);
  assert.match(finances, /financeSection/);
  assert.match(finances, /title="Finances"/);
});
