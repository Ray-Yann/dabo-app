import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../app/app/courses/page.tsx", import.meta.url),
  "utf8"
);

test("Courses imports the helper that removes only a confirmed queued change", () => {
  assert.ok(source.includes("removeSyncedShoppingStatusChange"));
});

test("Courses has a dedicated pending shopping synchronization function", () => {
  assert.ok(source.includes("const syncPendingShoppingChanges = useCallback(async () => {"));
});

test("pending changes are replayed through the canonical shopping status RPC", () => {
  const syncStart = source.indexOf("const syncPendingShoppingChanges = useCallback(async () => {");
  const rpcPosition = source.indexOf(
    'supabase.rpc("dabo_set_shopping_item_status"',
    syncStart
  );

  assert.ok(syncStart >= 0);
  assert.ok(rpcPosition > syncStart);
});

test("a queued change is removed only after a successful RPC", () => {
  const syncStart = source.indexOf("const syncPendingShoppingChanges = useCallback(async () => {");
  const errorPosition = source.indexOf("if (error)", syncStart);
  const removePosition = source.indexOf(
    "removeSyncedShoppingStatusChange(",
    syncStart
  );

  assert.ok(errorPosition > syncStart);
  assert.ok(removePosition > errorPosition);
});

test("the remaining queue is persisted during synchronization", () => {
  const syncStart = source.indexOf("const syncPendingShoppingChanges = useCallback(async () => {");
  const savePosition = source.indexOf(
    "saveShoppingOfflineQueue(",
    syncStart
  );

  assert.ok(syncStart >= 0);
  assert.ok(savePosition > syncStart);
});

test("Courses listens for browser reconnection and starts synchronization", () => {
  assert.ok(source.includes('window.addEventListener("online"'));
  assert.ok(source.includes("syncPendingShoppingChanges()"));
});

test("successful synchronization refreshes the shopping list from the server", () => {
  const syncStart = source.indexOf("const syncPendingShoppingChanges = useCallback(async () => {");
  const loadPosition = source.indexOf("loadItems()", syncStart);

  assert.ok(syncStart >= 0);
  assert.ok(loadPosition > syncStart);
});
