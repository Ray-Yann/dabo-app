import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../app/app/courses/page.tsx", import.meta.url),
  "utf8"
);

test("Courses imports the offline toggle and queue helpers", () => {
  assert.ok(source.includes("applyOfflineShoppingStatus"));
  assert.ok(source.includes("queueShoppingStatusChange"));
  assert.ok(source.includes("saveShoppingOfflineQueue"));
});

test("toggle detects an offline browser before using the canonical server RPC", () => {
  const toggleStart = source.indexOf("async function toggle");
  const rpcPosition = source.indexOf('supabase.rpc("dabo_set_shopping_item_status"', toggleStart);
  const offlinePosition = source.indexOf("navigator.onLine", toggleStart);

  assert.ok(toggleStart >= 0);
  assert.ok(offlinePosition > toggleStart);
  assert.ok(rpcPosition > offlinePosition);
});

test("offline toggle updates the local shopping items", () => {
  assert.ok(source.includes("applyOfflineShoppingStatus("));
  assert.ok(source.includes("setItems("));
});

test("offline toggle persists the updated household snapshot", () => {
  assert.ok(source.includes("saveShoppingOfflineSnapshot("));
  assert.ok(source.includes("createShoppingOfflineSnapshot("));
});

test("offline toggle persists a coalesced pending status change", () => {
  assert.ok(source.includes("queueShoppingStatusChange("));
  assert.ok(source.includes("saveShoppingOfflineQueue("));
});
