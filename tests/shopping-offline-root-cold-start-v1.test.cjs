const fs = require("fs");
const assert = require("node:assert/strict");
const test = require("node:test");

const source = fs.readFileSync("app/page.tsx", "utf8");

test("cold offline startup detects offline state before querying members", () => {
  assert.match(source, /navigator\.onLine/);
});

test("cold offline startup can restore cached household context", () => {
  assert.match(source, /loadHouseholdOfflineContext/);
});

test("cold offline startup routes an existing cached household directly to Courses", () => {
  assert.match(source, /router\.replace\(["']\/app\/courses["']\)/);
});

test("cold offline startup does not require the members network query before offline recovery", () => {
  const offlineCheck = source.indexOf("navigator.onLine");
  const membersQuery = source.indexOf('.from("members")');

  assert.ok(offlineCheck >= 0, "offline detection is missing");
  assert.ok(membersQuery >= 0, "members query is missing");
  assert.ok(
    offlineCheck < membersQuery,
    "offline recovery must be considered before the members network query"
  );
});
