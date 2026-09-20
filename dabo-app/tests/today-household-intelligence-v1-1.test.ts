import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("app/app/page.tsx", "utf8");

test("Aujourd’hui Intelligence V1.1 distingue chargement et vrai silence", () => {
  assert.match(source, /dashboardReady/);
  assert.match(source, /!dashboardReady \|\| dashboardLoadError/);
  assert.match(source, /attentionItems\.length === 0/);
  assert.ok(source.indexOf("!dashboardReady || dashboardLoadError") < source.indexOf("attentionItems.length === 0"));
});

test("Aujourd’hui Intelligence V1.1 ne calcule pas le repère avant la fin de lecture", () => {
  assert.match(source, /if \(!household \|\| !dashboardReady \|\| dashboardLoadError\) return null/);
});

test("Aujourd’hui Intelligence V1.1 rend les erreurs de chargement explicites dans le code", () => {
  assert.match(source, /DABO Today dashboard load failed/);
  assert.match(source, /setDashboardLoadError\(true\)/);
});

test("Aujourd’hui Intelligence V1.1 annule proprement une lecture devenue obsolète", () => {
  assert.match(source, /let cancelled = false/);
  assert.match(source, /cancelled = true/);
});

test("Aujourd’hui Intelligence V1.1 recharge selon le client Supabase actif", () => {
  assert.match(source, /\[household, me, supabase\]/);
});
