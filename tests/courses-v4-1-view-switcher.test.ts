import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("app/app/courses/page.tsx", "utf8");

test("Courses V4.1 exposes three directly selectable localized views", () => {
  for (const view of ["to_buy", "suggestions", "history"]) {
    assert.match(source, new RegExp(`\\["${view}",`));
  }
  assert.match(source, /role="group" aria-labelledby="courses-view-label"/);
  assert.match(source, /aria-pressed=\{view === key\}/);
  assert.match(source, /onClick=\{\(\) => setView\(key\)\}/);
  assert.match(source, /!offlineShoppingMode && \(/);
  assert.match(source, /const effectiveView = offlineShoppingMode \? "to_buy" : view/);
});
