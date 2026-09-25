const fs = require("fs");
const test = require("node:test");
const assert = require("node:assert/strict");

const pagePath = "app/app/calendrier/page.tsx";

test("upcoming calendar completion uses the compact circular control used by tasks and shopping", () => {
  const source = fs.readFileSync(pagePath, "utf8");

  const completionCall =
    "completeOccurrence(e.id, calendarOccurrenceDate(e.next))";
  const callIndex = source.indexOf(completionCall);

  assert.notEqual(
    callIndex,
    -1,
    "the upcoming occurrence completion action must exist"
  );

  const surroundingSource = source.slice(
    Math.max(0, callIndex - 500),
    Math.min(source.length, callIndex + 500)
  );

  assert.match(
    surroundingSource,
    /w-5 h-5 rounded-full border-2 border-border shrink-0 cursor-pointer/,
    "calendar must reuse the compact circular completion control"
  );

  assert.doesNotMatch(
    surroundingSource,
    />\s*\{t\("calendar_mark_done"\)\}\s*</,
    "the upcoming card must not render a large text Mark as done button"
  );
});

test("upcoming calendar completion control remains accessible without visible text", () => {
  const source = fs.readFileSync(pagePath, "utf8");

  const completionCall =
    "completeOccurrence(e.id, calendarOccurrenceDate(e.next))";
  const callIndex = source.indexOf(completionCall);

  assert.notEqual(callIndex, -1);

  const surroundingSource = source.slice(
    Math.max(0, callIndex - 500),
    Math.min(source.length, callIndex + 500)
  );

  assert.match(
    surroundingSource,
    /aria-label=\{t\("calendar_mark_done"\)\}/
  );
});
