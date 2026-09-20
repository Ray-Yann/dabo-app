import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { isWithinReminderWindow } from "../lib/calendar-reminder-window";

const route = fs.readFileSync("app/api/calendar-reminders/route.ts", "utf8");
const page = fs.readFileSync("app/app/calendrier/page.tsx", "utf8");
const i18n = fs.readFileSync("lib/i18n.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260918_calendar_reminders_v11.sql", "utf8");

test("rappel horaire lit heure, fuseau et recurrence", () => {
  assert.match(route, /event_time,time_zone/);
  assert.match(route, /isWithinReminderWindow\(local\.time, event\.event_time\.slice\(0,5\)\)/);
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


test("rappel calendrier tolere cinq minutes de retard sans anticiper", () => {
  assert.equal(isWithinReminderWindow("07:44", "07:45"), false);
  assert.equal(isWithinReminderWindow("07:45", "07:45"), true);
  assert.equal(isWithinReminderWindow("07:46", "07:45"), true);
  assert.equal(isWithinReminderWindow("07:50", "07:45"), true);
  assert.equal(isWithinReminderWindow("07:51", "07:45"), false);
  assert.doesNotMatch(route, /local\.time !== event\.event_time/);
});

test("diagnostic rappel expose chaque etape serveur sans journaliser les cles push", () => {
  assert.match(route, /Time window matched/);
  assert.match(route, /Reminder due/);
  assert.match(route, /Claim failed/);
  assert.match(route, /Subscriptions loaded/);
  assert.match(route, /Web Push sent/);
  assert.doesNotMatch(route, /p256dh.*console/);
  assert.doesNotMatch(route, /auth.*console/);
});

