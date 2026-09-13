import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const householdContext = fs.readFileSync("lib/household-context.tsx", "utf8");
const today = fs.readFileSync("app/app/page.tsx", "utf8");

test("Mobile Performance V1 parallelizes independent household bootstrap reads", () => {
  assert.match(householdContext, /Promise\.all\(\[/);
  assert.match(householdContext, /householdMembersResult/);
  assert.match(householdContext, /householdsResult/);
});

test("Mobile Performance V1 loads dashboard resources in one parallel wave", () => {
  assert.match(today, /Mobile Performance V1: the dashboard used to load its data/);
  assert.match(today, /allTasksResult,/);
  assert.match(today, /activeShoppingResult,/);
  assert.match(today, /billsResult,/);
  assert.match(today, /setTasks\(allTasks\.filter\(\(task\) => task\.status === "pending"\)\)/);
});

test("Mobile Performance V1 defers app_open analytics away from critical startup", () => {
  assert.match(today, /requestIdleCallback/);
  assert.match(today, /setTimeout\(schedule, 1200\)/);
});
