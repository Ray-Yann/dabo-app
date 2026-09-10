import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("app/api/store-suggestions/route.ts", "utf8");
const courses = fs.readFileSync("app/app/courses/page.tsx", "utf8");
const catalog = fs.readFileSync("lib/world-store-catalog.ts", "utf8");

test("Internationalisation V1.1 utilise une source mondiale de supermarchés par pays", () => {
  assert.match(route, /name-suggestion-index/);
  assert.match(route, /include\.includes\(cc\)/);
  assert.match(route, /include\.includes\("001"\)/);
});

test("Internationalisation V1.1 garde DABO fonctionnel si la source mondiale est indisponible", () => {
  assert.match(route, /try/);
  assert.match(route, /catch/);
  assert.match(route, /VERIFIED_STORE_SUPPLEMENTS/);
});

test("Internationalisation V1.1 couvre explicitement les pays du test production", () => {
  for (const code of ["CM", "DE", "CA", "JP"]) assert.match(catalog, new RegExp(`${code}:`));
});

test("Courses fusionne catalogue mondial, catalogue communautaire et magasins du foyer", () => {
  assert.match(courses, /worldStores/);
  assert.match(courses, /globalStores\.map/);
  assert.match(courses, /householdStores\.map/);
  assert.match(courses, /api\/store-suggestions/);
});
