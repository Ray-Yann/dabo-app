import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../app/app/courses/page.tsx", import.meta.url),
  "utf8"
);

test("Courses tracks whether the browser is online", () => {
  assert.ok(source.includes("isOnline"));
  assert.ok(source.includes("setIsOnline"));
});

test("Courses listens for both online and offline browser events", () => {
  assert.ok(source.includes('addEventListener("online"'));
  assert.ok(source.includes('addEventListener("offline"'));
  assert.ok(source.includes('removeEventListener("online"'));
  assert.ok(source.includes('removeEventListener("offline"'));
});

test("Courses tracks active offline queue synchronization", () => {
  assert.ok(source.includes("isSyncingOfflineChanges"));
  assert.ok(source.includes("setIsSyncingOfflineChanges"));
});

test("Courses tracks the number of pending offline changes", () => {
  assert.ok(source.includes("pendingOfflineChanges"));
  assert.ok(source.includes("setPendingOfflineChanges"));
});

test("Courses tracks whether an offline snapshot is available", () => {
  assert.ok(source.includes("hasOfflineSnapshot"));
  assert.ok(source.includes("setHasOfflineSnapshot"));
});

test("loading a cached shopping snapshot marks it as available", () => {
  const loadIndex = source.indexOf("const loadItems = useCallback(async () => {");
  const snapshotIndex = source.indexOf("if (snapshot)", loadIndex);
  const stateIndex = source.indexOf("setHasOfflineSnapshot(true)", snapshotIndex);

  assert.ok(loadIndex >= 0);
  assert.ok(snapshotIndex > loadIndex);
  assert.ok(stateIndex > snapshotIndex);
});

test("offline toggle updates the visible pending change count", () => {
  const toggleIndex = source.indexOf("async function toggle(");
  const stateIndex = source.indexOf(
    "setPendingOfflineChanges(updatedQueue.length)",
    toggleIndex
  );

  assert.ok(toggleIndex >= 0);
  assert.ok(stateIndex > toggleIndex);
});

test("successful synchronization refreshes the pending queue count", () => {
  const syncIndex = source.indexOf("const syncPendingShoppingChanges = useCallback(async () => {");
  const stateIndex = source.indexOf(
    "setPendingOfflineChanges(queue.length)",
    syncIndex
  );

  assert.ok(syncIndex >= 0);
  assert.ok(stateIndex > syncIndex);
});
