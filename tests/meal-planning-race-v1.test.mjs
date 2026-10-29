import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../app/app/courses/repas/page.tsx', import.meta.url), 'utf8');
test('ignores stale responses after date/period/household changes', () => {
 assert.match(src, /requestId!==requestSequence\.current/);
 assert.match(src, /\+\+requestSequence\.current/);
});
test('clears old selections before fetching new needs', () => {
 const start=src.indexOf('const reload=useCallback');
 const fetch=src.indexOf('await Promise.all',start);
 assert.ok(src.indexOf('setSelectedNeeds([])',start)<fetch);
});
test('prevents submitting stale or empty ingredient selection', () => {
 assert.match(src, /busy\|\|loading\|\|needsError\|\|selectedNeeds\.length===0/);
 assert.match(src, /if\(selected\.length===0\)/);
});

import { readFileSync as readPage } from "node:fs";
test("date and period changes immediately invalidate in-flight responses", () => {
 const page = readPage(new URL("../app/app/courses/repas/page.tsx", import.meta.url), "utf8");
 assert.match(page, /onChange=\{e=>\{.*?requestSequence\.current\+\+;selectionContext\.current="";setSelectedNeeds\(\[\]\);(?:setNeeds\(\[\]\);)?(?:setShoppingResult\(""\);setShoppingConflicts\(\[\]\);)?(?:setError\(""\);setNeedsError\(""\);)?(?:setLoading\(true\);)?setDay/);
 assert.equal((page.match(/requestSequence\.current\+\+;selectionContext\.current="";setSelectedNeeds\(\[\]\);(?:setNeeds\(\[\]\);)?(?:setShoppingResult\(""\);setShoppingConflicts\(\[\]\);)?(?:setError\(""\);setNeedsError\(""\);)?(?:setLoading\(true\);)?setPeriod/g)||[]).length,2);
});
