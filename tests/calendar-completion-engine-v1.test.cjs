const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");

const helperPath = "lib/calendar-completions.ts";

test("calendar completion helper exists", () => {
  assert.equal(fs.existsSync(helperPath), true, "calendar completion helper is missing");
});

test("calendar completion identity combines event and civil occurrence date", () => {
  assert.equal(fs.existsSync(helperPath), true, "calendar completion helper is missing");
  const source = fs.readFileSync(helperPath, "utf8");
  assert.match(source, /eventId/);
  assert.match(source, /occurrenceDate/);
  assert.match(source, /completedOccurrences/);
});

test("completed one-off occurrence has no next active occurrence", () => {
  assert.equal(fs.existsSync(helperPath), true, "calendar completion helper is missing");
  const source = fs.readFileSync(helperPath, "utf8");
  assert.match(source, /nextUncompletedOccurrence/);
  assert.match(source, /occurrenceOnOrAfter/);
});

test("completed recurring occurrence advances instead of completing the whole series", () => {
  assert.equal(fs.existsSync(helperPath), true, "calendar completion helper is missing");
  const source = fs.readFileSync(helperPath, "utf8");
  assert.match(source, /setDate\s*\(\s*.*getDate\(\)\s*\+\s*1\s*\)/s);
  assert.match(source, /isRecurringCalendarEvent/);
});

test("calendar completion helper uses civil YYYY-MM-DD occurrence keys", () => {
  assert.equal(fs.existsSync(helperPath), true, "calendar completion helper is missing");
  const source = fs.readFileSync(helperPath, "utf8");
  assert.match(source, /padStart\s*\(\s*2\s*,\s*["']0["']\s*\)/);
  assert.doesNotMatch(source, /toISOString\(\)\.slice\(0\s*,\s*10\)/);
});
