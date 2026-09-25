const fs = require("fs");
const test = require("node:test");
const assert = require("node:assert/strict");

const path = "app/api/export-data/route.ts";

test("personal data export includes calendar occurrence completions", () => {
  const source = fs.readFileSync(path, "utf8");

  assert.match(source, /calendar_event_completions/);
  assert.match(source, /calendarCompletionsResult/);
  assert.match(source, /calendarCompletions:/);
});

test("calendar completion export is limited to the user's personal calendar events", () => {
  const source = fs.readFileSync(path, "utf8");

  assert.match(
    source,
    /\.from\("calendar_event_completions"\)[\s\S]*?\.in\("event_id",\s*personalEventIds\)/
  );
});

test("calendar completion export contains occurrence completion metadata", () => {
  const source = fs.readFileSync(path, "utf8");

  const start = source.indexOf('.from("calendar_event_completions")');
  assert.notEqual(start, -1);

  const block = source.slice(start, start + 500);

  assert.match(block, /event_id/);
  assert.match(block, /occurrence_date/);
  assert.match(block, /completed_by/);
  assert.match(block, /completed_at/);
});

test("calendar completion export errors participate in portability failure handling", () => {
  const source = fs.readFileSync(path, "utf8");

  const errorBlockStart = source.indexOf("const queryError");
  assert.notEqual(errorBlockStart, -1);

  const errorBlock = source.slice(errorBlockStart, errorBlockStart + 1000);

  assert.match(errorBlock, /calendarCompletionsResult\.error/);
});
