const fs = require("fs");
const test = require("node:test");
const assert = require("node:assert/strict");

const migration = fs.readFileSync(
  "supabase/migrations/2026-09-25-calendar-completions-v1.sql",
  "utf8"
);

test("Calendar completions accorde la lecture au service_role pour les rappels serveur", () => {
  assert.match(
    migration,
    /grant\s+select\s+on\s+table\s+public\.calendar_event_completions\s+to\s+service_role\s*;/i,
    "calendar_event_completions doit accorder SELECT a service_role"
  );
});
