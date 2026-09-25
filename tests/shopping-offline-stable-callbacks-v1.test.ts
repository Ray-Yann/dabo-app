import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../app/app/courses/page.tsx", import.meta.url),
  "utf8"
);

test("Courses imports useCallback for stable async loaders", () => {
  assert.ok(
    source.includes(
      'import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";'
    )
  );
});

test("shopping finance loader is memoized", () => {
  assert.ok(
    source.includes(
      'const loadShoppingFinancePrompt = useCallback(async () => {'
    )
  );
});

test("shopping items loader is memoized", () => {
  assert.ok(
    source.includes(
      'const loadItems = useCallback(async () => {'
    )
  );
});

test("offline shopping synchronizer is memoized", () => {
  assert.ok(
    source.includes(
      'const syncPendingShoppingChanges = useCallback(async () => {'
    )
  );
});

test("effects depend on their stable callbacks", () => {
  assert.ok(
    source.includes(
      '[household, loadItems]'
    )
  );

  assert.ok(
    source.includes(
      '[household, syncPendingShoppingChanges]'
    )
  );

  assert.ok(
    source.includes(
      '[household, me?.id, offlineShoppingMode, loadShoppingFinancePrompt]'
    )
  );
});
