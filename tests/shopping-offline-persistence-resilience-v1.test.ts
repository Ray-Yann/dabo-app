import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const coursesSource = fs.readFileSync(
  new URL("../app/app/courses/page.tsx", import.meta.url),
  "utf8"
);

test("offline toggle preserves the last real server synchronization timestamp", () => {
  assert.ok(
    coursesSource.includes("currentSnapshot?.syncedAt")
  );
});

test("offline toggle loads the current snapshot before persisting the local change", () => {
  const offlineIndex = coursesSource.indexOf("if (!navigator.onLine && household)");
  const snapshotLoadIndex = coursesSource.indexOf(
    "loadShoppingOfflineSnapshot(household.id)",
    offlineIndex
  );

  assert.ok(offlineIndex >= 0);
  assert.ok(snapshotLoadIndex > offlineIndex);
});

test("offline status queue is persisted before the updated snapshot", () => {
  const offlineIndex = coursesSource.indexOf("if (!navigator.onLine && household)");
  const queueSaveIndex = coursesSource.indexOf(
    "await saveShoppingOfflineQueue(household.id, updatedQueue)",
    offlineIndex
  );
  const snapshotSaveIndex = coursesSource.indexOf(
    "await saveShoppingOfflineSnapshot(",
    offlineIndex
  );

  assert.ok(queueSaveIndex > offlineIndex);
  assert.ok(snapshotSaveIndex > queueSaveIndex);
});

test("offline persistence failure is caught locally", () => {
  const offlineIndex = coursesSource.indexOf("if (!navigator.onLine && household)");
  const catchIndex = coursesSource.indexOf(
    "offline shopping persistence failed",
    offlineIndex
  );

  assert.ok(catchIndex > offlineIndex);
});

test("offline animation state is cleared even when local persistence fails", () => {
  const offlineIndex = coursesSource.indexOf("if (!navigator.onLine && household)");
  const finallyIndex = coursesSource.indexOf("finally", offlineIndex);
  const clearIndex = coursesSource.indexOf("setAnimatingId(null)", finallyIndex);

  assert.ok(finallyIndex > offlineIndex);
  assert.ok(clearIndex > finallyIndex);
});
