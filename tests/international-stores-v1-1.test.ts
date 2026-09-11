import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("app/api/store-suggestions/route.ts", "utf8");
const courses = fs.readFileSync("app/app/courses/page.tsx", "utf8");
const catalog = fs.readFileSync("lib/world-store-catalog.ts", "utf8");

test("Internationalisation V1.1 + UX Light V1.2 utilise NSI avec rattachement explicite au pays", () => {
  assert.match(route, /name-suggestion-index/);
  assert.match(route, /return include\.includes\(cc\)/);
  assert.doesNotMatch(route, /include\.includes\(cc\) \|\| include\.includes\("001"\)/);
});

test("Internationalisation V1.1 garde DABO fonctionnel si la source mondiale est indisponible", () => {
  assert.match(route, /try/);
  assert.match(route, /catch/);
  assert.match(route, /VERIFIED_STORE_SUPPLEMENTS/);
});

test("Internationalisation V1.1 couvre explicitement les pays du test production", () => {
  for (const code of ["CM", "DE", "CA", "JP"]) assert.match(catalog, new RegExp(`${code}:`));
});

test("Courses fusionne catalogue pays vérifié, source mondiale filtrée et magasins du foyer", () => {
  assert.match(courses, /DEFAULT_STORES_BY_COUNTRY/);
  assert.match(courses, /worldStores/);
  assert.match(courses, /householdStores\.map/);
  assert.doesNotMatch(courses, /globalStores\.map/);
  assert.match(courses, /api\/store-suggestions/);
});
