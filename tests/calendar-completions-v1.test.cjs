const fs = require("fs");
const test = require("node:test");
const assert = require("node:assert/strict");

const migrationPath = "supabase/migrations/2026-09-25-calendar-completions-v1.sql";
const pagePath = "app/app/calendrier/page.tsx";

test("calendar completions have a dedicated occurrence-level persistence table", () => {
  assert.equal(fs.existsSync(migrationPath), true, "calendar completion migration is missing");
  const sql = fs.readFileSync(migrationPath, "utf8");

  assert.match(sql, /calendar_event_completions/i);
  assert.match(sql, /event_id/i);
  assert.match(sql, /occurrence_date/i);
  assert.match(sql, /completed_by/i);
  assert.match(sql, /completed_at/i);
});

test("one calendar occurrence can only have one active completion", () => {
  assert.equal(fs.existsSync(migrationPath), true, "calendar completion migration is missing");
  const sql = fs.readFileSync(migrationPath, "utf8");

  assert.match(
    sql,
    /unique\s*\(\s*event_id\s*,\s*occurrence_date\s*\)/i,
    "completion must be unique per event occurrence"
  );
});

test("calendar completion security is protected by row level security", () => {
  assert.equal(fs.existsSync(migrationPath), true, "calendar completion migration is missing");
  const sql = fs.readFileSync(migrationPath, "utf8");

  assert.match(sql, /enable row level security/i);
  assert.match(sql, /calendar_events/i);
  assert.match(sql, /visibility/i);
  assert.match(sql, /private_owner_id/i);
});

test("calendar page loads and tracks completed occurrences separately from events", () => {
  const source = fs.readFileSync(pagePath, "utf8");

  assert.match(source, /calendar_event_completions/);
  assert.match(source, /occurrence_date/);
  assert.match(source, /completedOccurrences/);
});

test("calendar completion acts on a precise occurrence instead of the whole recurring event", () => {
  const source = fs.readFileSync(pagePath, "utf8");

  assert.match(source, /completeOccurrence/);
  assert.match(source, /occurrenceDate/);
  assert.match(source, /event\.id|eventId/);
});

test("completed occurrence can be restored without deleting the calendar event", () => {
  const source = fs.readFileSync(pagePath, "utf8");

  assert.match(source, /restoreOccurrence/);
  const completeStart = source.indexOf("async function completeOccurrence");
  const restoreStart = source.indexOf("async function restoreOccurrence");
  assert.notEqual(completeStart, -1, "completeOccurrence must exist");
  assert.notEqual(restoreStart, -1, "restoreOccurrence must exist");

  const completeSource = source.slice(completeStart, restoreStart);
  assert.doesNotMatch(
    completeSource,
    /\.from\(["']calendar_events["']\)[\s\S]*?\.delete\(/,
    "completion must not delete the calendar event"
  );
});
