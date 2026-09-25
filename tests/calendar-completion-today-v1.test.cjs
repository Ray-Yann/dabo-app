const fs = require("fs");
const test = require("node:test");
const assert = require("node:assert/strict");

const todayPath = "app/app/page.tsx";
const enginePath = "lib/dabo-engine.ts";

test("Today loads calendar occurrence completions", () => {
  const source = fs.readFileSync(todayPath, "utf8");

  assert.match(source, /calendar_event_completions/);
  assert.match(source, /calendarCompletedOccurrenceSet/);
});

test("Today week insights use the next uncompleted calendar occurrence", () => {
  const source = fs.readFileSync(todayPath, "utf8");

  assert.match(source, /nextUncompletedOccurrence/);
  assert.doesNotMatch(
    source,
    /weekEventInsights[\s\S]{0,1200}nextOccurrence\(event\.event_date,\s*event\.recurring\)/
  );
});

test("Today calendar counter ignores completed occurrences", () => {
  const source = fs.readFileSync(todayPath, "utf8");

  const counterStart = source.indexOf("const upcomingHouseholdEventsCount");
  assert.notEqual(counterStart, -1);

  const counterSource = source.slice(counterStart, counterStart + 900);
  assert.match(counterSource, /nextUncompletedOccurrence/);
  assert.doesNotMatch(
    counterSource,
    /nextOccurrence\(event\.event_date,\s*event\.recurring\)/
  );
});

test("DABO engine accepts completed calendar occurrences", () => {
  const source = fs.readFileSync(enginePath, "utf8");

  assert.match(source, /completedCalendarOccurrences\??:/);
  assert.match(source, /calendarCompletedOccurrenceSet/);
});

test("DABO upcoming event insights skip completed occurrences", () => {
  const source = fs.readFileSync(enginePath, "utf8");

  assert.match(source, /nextUncompletedOccurrence/);

  const builderStart = source.indexOf("function buildUpcomingEventInsights");
  const generatorStart = source.indexOf("export function generateDaboInsights");

  assert.notEqual(builderStart, -1);
  assert.notEqual(generatorStart, -1);

  const builderSource = source.slice(builderStart, generatorStart);

  assert.doesNotMatch(
    builderSource,
    /occurrenceOnOrAfter\(event,\s*parseCivilDate\(today\)\)/
  );
});
