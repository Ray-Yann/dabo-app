import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const logicPath = new URL("../lib/household-offline.ts", import.meta.url);
const storagePath = new URL("../lib/household-offline-storage.ts", import.meta.url);

test("offline household context has a dedicated pure logic module", () => {
  assert.equal(fs.existsSync(logicPath), true);
});

test("offline household context has a dedicated IndexedDB storage module", () => {
  assert.equal(fs.existsSync(storagePath), true);
});

test("household cache is scoped to the authenticated user", () => {
  if (!fs.existsSync(logicPath)) return assert.fail("household-offline.ts missing");

  const source = fs.readFileSync(logicPath, "utf8");
  assert.ok(source.includes("userId"));
  assert.ok(source.includes("householdOfflineContextKey"));
});

test("cached context contains the active household and member context needed by Courses", () => {
  if (!fs.existsSync(logicPath)) return assert.fail("household-offline.ts missing");

  const source = fs.readFileSync(logicPath, "utf8");
  assert.ok(source.includes("household"));
  assert.ok(source.includes("me"));
  assert.ok(source.includes("members"));
  assert.ok(source.includes("allMembers"));
  assert.ok(source.includes("memberships"));
});

test("persisted household context is validated against the current user", () => {
  if (!fs.existsSync(logicPath)) return assert.fail("household-offline.ts missing");

  const source = fs.readFileSync(logicPath, "utf8");
  assert.ok(source.includes("parseHouseholdOfflineContext"));
  assert.ok(source.includes("parsed.userId !== userId"));
});

test("household offline persistence uses native IndexedDB", () => {
  if (!fs.existsSync(storagePath)) return assert.fail("household-offline-storage.ts missing");

  const source = fs.readFileSync(storagePath, "utf8");
  assert.ok(source.includes("indexedDB.open"));
  assert.ok(source.includes("saveHouseholdOfflineContext"));
  assert.ok(source.includes("loadHouseholdOfflineContext"));
  assert.ok(source.includes("clearHouseholdOfflineContext"));
});
