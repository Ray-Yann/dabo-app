import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("app/api/admin/dashboard/route.ts", "utf8");
const page = fs.readFileSync("app/admin/page.tsx", "utf8");
const legacyPage = fs.readFileSync("page.tsx", "utf8");

test("Admin Resilience V1 ne fait plus tomber tout le cockpit pour une source en Gateway Timeout", () => {
  assert.doesNotMatch(route, /Core data error/);
  assert.doesNotMatch(route, /Impossible de charger les données administrateur/);
  assert.match(route, /degradedSources/);
  assert.match(route, /sourceAvailability/);
});

test("Admin Resilience V1 journalise précisément la source défaillante", () => {
  assert.match(route, /Source unavailable: \$\{source\}/);
  for (const source of ["households", "members", "tasks", "shopping", "calendar", "contributions", "authUsers"]) {
    assert.match(route, new RegExp(`${source}:`));
  }
});

test("Admin Resilience V1 remplace seulement la source indisponible par un jeu vide", () => {
  assert.match(route, /sourceAvailability\.households \? households\.data \|\| \[\] : \[\]/);
  assert.match(route, /sourceAvailability\.authUsers \? auth\.data\?\.users \|\| \[\] : \[\]/);
});

test("Admin Resilience V1 signale visiblement des données partielles", () => {
  assert.match(page, /Données partielles\./);
  assert.match(page, /degradedSources\.join/);
  assert.match(page, /indicateurs dépendant de la source concernée peuvent être incomplets/);
  assert.match(legacyPage, /Données partielles\./);
});

test("Admin Resilience V1 empêche LOBA de tirer certains constats depuis une source absente", () => {
  assert.match(route, /sourceAvailability\.authUsers && sourceAvailability\.members/);
  assert.match(route, /sourceAvailability\.tasks && tasksDelta/);
  assert.match(route, /sharingAvailable && current30\.shares === 0/);
});
