const fs = require("fs");
const test = require("node:test");
const assert = require("node:assert/strict");

const migrationPath = "supabase/migrations/2026-09-25-calendar-completions-v1.sql";

test("calendar completion migration grants authenticated the privileges required by the app", () => {
  const source = fs.readFileSync(migrationPath, "utf8");

  assert.match(
    source,
    /grant\s+select\s*,\s*insert\s*,\s*delete\s+on(?:\s+table)?\s+public\.calendar_event_completions\s+to\s+authenticated\s*;/i,
    "authenticated must be able to select, insert and delete calendar completions before RLS policies can apply"
  );
});

test("calendar completion migration does not grant unnecessary update privileges", () => {
  const source = fs.readFileSync(migrationPath, "utf8");

  assert.doesNotMatch(
    source,
    /grant[\s\S]*?\bupdate\b[\s\S]*?calendar_event_completions[\s\S]*?authenticated/i,
    "calendar completions do not require UPDATE privileges"
  );
});
