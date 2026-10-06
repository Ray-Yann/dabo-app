import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../app/app/courses/page.tsx", import.meta.url),
  "utf8"
);

test("shopping quick action opens the form synchronously without a deferred timer", () => {
  assert.ok(source.includes('setView("to_buy");'));
  assert.ok(source.includes('setEditingId(null);'));
  assert.ok(source.includes('setShowAdd(true);'));

  assert.ok(
    !source.includes(
      'const quickActionTimer = window.setTimeout(() => {'
    )
  );

  assert.ok(
    !source.includes(
      'return () => window.clearTimeout(quickActionTimer);'
    )
  );
});

test("shopping quick action still consumes the first query parameter", () => {
  assert.ok(source.includes('url.searchParams.get("first") !== "1"'));
  assert.ok(source.includes('url.searchParams.delete("first")'));
  assert.ok(source.includes('window.history.replaceState('));
});


