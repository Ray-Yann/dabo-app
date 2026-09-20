import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("app/api/calendar-reminders/route.ts", "utf8");
const page = fs.readFileSync("app/app/calendrier/page.tsx", "utf8");
const i18n = fs.readFileSync("lib/i18n.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260918_calendar_reminders_v11.sql", "utf8");

test("rappel horaire lit heure, fuseau et recurrence", () => {
  assert.match(route, /event_time,time_zone/);
  assert.match(route, /REMINDER_LOOKBACK_MINUTES = 5/);
  assert.match(route, /dueLocalSlot/);
  assert.match(route, /minutesAgo <= REMINDER_LOOKBACK_MINUTES/);
  assert.match(route, /occurrenceIso/);
  assert.match(route, /reminder_days_before/);
});
test("anti doublon persistant par occurrence membre et delai", () => {
  assert.match(route, /calendar_reminder_deliveries/);
  assert.match(migration, /unique\(event_id, member_id, occurrence_date, reminder_days_before\)/);
});
test("creation et modification enregistrent le fuseau navigateur", () => {
  assert.equal((page.match(/Intl\.DateTimeFormat\(\)\.resolvedOptions\(\)\.timeZone/g) || []).length, 2);
});
test("UX rappel et singulier quotidien sont traduits dans les 7 langues", () => {
  assert.match(page, /calendar_add_reminder/);
  assert.equal((i18n.match(/calendar_add_reminder:/g) || []).length, 7);
  assert.equal((i18n.match(/calendar_every_day:/g) || []).length, 7);
});

test("rappel dispose de diagnostics serveur ciblés", () => {
  assert.match(route, /\[calendar-reminders\] Reminder due/);
  assert.match(route, /\[calendar-reminders\] Delivery target/);
  assert.match(route, /\[calendar-reminders\] Web Push failed/);
});
