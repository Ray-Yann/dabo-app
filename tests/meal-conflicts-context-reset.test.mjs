import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const page = readFileSync(new URL("../app/app/courses/repas/page.tsx", import.meta.url), "utf8");
test("changing the day clears stale shopping results and conflicts immediately", () => {
  assert.match(page, /onChange=\{e=>\{.*?requestSequence\.current\+\+;selectionContext\.current="";setSelectedNeeds\(\[\]\);setNeeds\(\[\]\);setShoppingResult\(""\);setShoppingConflicts\(\[\]\);setError\(""\);setNeedsError\(""\);setLoading\(true\);setDay\(e\.target\.value\)/);
});
test("changing the calculation period clears stale shopping conflicts immediately", () => {
  for (const period of ["day", "week"]) {
    assert.ok(page.includes(`setShoppingResult("");setShoppingConflicts([]);setError("");setNeedsError("");setLoading(true);setPeriod("${period}")`));
  }
});

test("date and period changes clear stale errors before reloading", () => {
  assert.equal((page.match(/setError\(""\);setNeedsError\(""\);setLoading\(true\);set(?:Day|Period)\(/g) ?? []).length, 3);
});

test("cleared date is rejected before triggering a new request", () => {
  const handler = page.match(/onChange=\{e=>\{(.*?)requestSequence\.current\+\+;selectionContext\.current=""/);
  assert.ok(handler);
  assert.match(handler[1], /if\(!validDay\(e\.target\.value\)\)return;/);
  assert.match(handler[1], /return;/);
});
