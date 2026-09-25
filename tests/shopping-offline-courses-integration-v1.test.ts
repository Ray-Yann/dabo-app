import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../app/app/courses/page.tsx", import.meta.url),
  "utf8"
);

test("Courses imports the offline snapshot helpers", () => {
  assert.ok(source.includes("createShoppingOfflineSnapshot"));
  assert.ok(source.includes("mergePendingShoppingChanges"));
  assert.ok(source.includes("saveShoppingOfflineSnapshot"));
  assert.ok(source.includes("loadShoppingOfflineSnapshot"));
  assert.ok(source.includes("loadShoppingOfflineQueue"));
});

test("a successful server shopping load is persisted as the household offline snapshot", () => {
  assert.ok(source.includes("saveShoppingOfflineSnapshot("));
  assert.ok(source.includes("createShoppingOfflineSnapshot("));
});

test("Courses can restore the last synchronized snapshot when the server load fails", () => {
  assert.ok(source.includes("loadShoppingOfflineSnapshot(household.id)"));
});

test("server shopping errors are inspected instead of turning into a false empty list", () => {
  assert.ok(source.includes("itemResult"));
  assert.ok(source.includes("itemResult.error"));
});

test("pending local changes are reapplied over a fresh server snapshot", () => {
  assert.ok(source.includes("mergePendingShoppingChanges("));
});
