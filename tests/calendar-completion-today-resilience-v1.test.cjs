const fs = require("fs");
const test = require("node:test");
const assert = require("node:assert/strict");

const pagePath = "app/app/page.tsx";

test("Today does not fail the whole dashboard when calendar completion metadata cannot load", () => {
  const source = fs.readFileSync(pagePath, "utf8");

  assert.doesNotMatch(
    source,
    /if\s*\(\s*completionResult\.error\s*\)\s*throw\s+completionResult\.error\s*;/,
    "calendar completion metadata must not be fatal to the Today dashboard"
  );

  assert.match(
    source,
    /completionResult\.error\s*\?\s*\[\]\s*:\s*\(\s*completionResult\.data\s+as\s+CalendarEventCompletion\[\]\s*\)\s*\|\|\s*\[\]/,
    "Today must fall back to no completed occurrences when completion metadata cannot load"
  );
});

test("Today still treats the base calendar events query as required", () => {
  const source = fs.readFileSync(pagePath, "utf8");

  assert.match(
    source,
    /if\s*\(\s*eventsResult\.error\s*\)\s*throw\s+eventsResult\.error\s*;/,
    "failure to load the actual calendar events must remain a dashboard load error"
  );
});
