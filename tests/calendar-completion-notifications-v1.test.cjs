const fs = require("fs");
const test = require("node:test");
const assert = require("node:assert/strict");

const precisePath = "app/api/calendar-reminders/route.ts";
const dailyPath = "app/api/daily-reminders/route.ts";

test("precise calendar reminders preload completed occurrences", () => {
  const source = fs.readFileSync(precisePath, "utf8");

  assert.match(source, /calendar_event_completions/);
  assert.match(source, /calendarCompletedOccurrenceSet/);
});

test("precise calendar reminder skips the exact completed occurrence before fanout", () => {
  const source = fs.readFileSync(precisePath, "utf8");

  const targetStart = source.indexOf("const targetOccurrenceDate");
  const dueStart = source.indexOf("due++", targetStart);

  assert.notEqual(targetStart, -1);
  assert.notEqual(dueStart, -1);

  const block = source.slice(targetStart, dueStart);

  assert.match(block, /isCalendarOccurrenceCompleted/);
  assert.match(block, /event\.id/);
  assert.match(block, /targetOccurrenceDate/);
});

test("daily reminders preload completed calendar occurrences", () => {
  const source = fs.readFileSync(dailyPath, "utf8");

  assert.match(source, /calendar_event_completions/);
  assert.match(source, /calendarCompletedOccurrenceSet/);
});

test("daily reminders use the next uncompleted occurrence", () => {
  const source = fs.readFileSync(dailyPath, "utf8");

  const eventsStart = source.indexOf('.from("calendar_events")');
  assert.notEqual(eventsStart, -1);

  const eventsBlock = source.slice(eventsStart);

  assert.match(eventsBlock, /nextUncompletedOccurrence/);
  assert.doesNotMatch(
    eventsBlock,
    /const occurrence = occurrenceOnOrAfter\(event\)/
  );
});

test("calendar completion notification filtering is batched instead of queried per event", () => {
  for (const path of [precisePath, dailyPath]) {
    const source = fs.readFileSync(path, "utf8");
    const loopStart = source.search(/for \(const (?:raw|event) of events \|\| \[\]\)/);

    assert.notEqual(loopStart, -1, `${path}: event loop missing`);

    const loopSource = source.slice(loopStart);

    assert.doesNotMatch(
      loopSource,
      /\.from\("calendar_event_completions"\)/,
      `${path}: completion query must not run inside the event loop`
    );
  }
});
