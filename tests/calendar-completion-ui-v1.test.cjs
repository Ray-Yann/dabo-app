const fs = require("fs");
const test = require("node:test");
const assert = require("node:assert/strict");

const pagePath = "app/app/calendrier/page.tsx";

test("upcoming calendar occurrence can be marked completed", () => {
  const source = fs.readFileSync(pagePath, "utf8");

  assert.match(source, /calendar_mark_done/);
  assert.match(source, /completeOccurrence\s*\(\s*e\.id\s*,\s*calendarOccurrenceDate\(e\.next\)\s*\)/);
});

test("month view keeps completed occurrences visible and identifies their completion state", () => {
  const source = fs.readFileSync(pagePath, "utf8");

  assert.match(source, /isCalendarOccurrenceCompleted/);
  assert.match(source, /event\.occurrenceDate/);
  assert.match(source, /calendar_completed/);
});

test("month occurrence can be completed or restored independently", () => {
  const source = fs.readFileSync(pagePath, "utf8");

  assert.match(
    source,
    /restoreOccurrence\s*\(\s*event\.id\s*,\s*event\.occurrenceDate\s*\)/
  );
  assert.match(
    source,
    /completeOccurrence\s*\(\s*event\.id\s*,\s*event\.occurrenceDate\s*\)/
  );
  assert.match(source, /calendar_restore/);
});

test("completion UI never removes the underlying calendar event", () => {
  const source = fs.readFileSync(pagePath, "utf8");

  const completeStart = source.indexOf("async function completeOccurrence");
  const restoreStart = source.indexOf("async function restoreOccurrence");

  assert.notEqual(completeStart, -1, "completeOccurrence must exist");
  assert.notEqual(restoreStart, -1, "restoreOccurrence must exist");

  const completeSource = source.slice(completeStart, restoreStart);

  assert.match(completeSource, /calendar_event_completions/);
  assert.doesNotMatch(
    completeSource,
    /\.from\(["']calendar_events["']\)[\s\S]*?\.delete\(/
  );
});

