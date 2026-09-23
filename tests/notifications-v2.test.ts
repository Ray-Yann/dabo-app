import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  billNotificationCandidate,
  buildDailyDigest,
  eventNotificationCandidate,
  taskNotificationCandidate,
} from "../lib/notification-policy";

test("Notifications V2 limite les rappels de tâches à des jalons utiles", () => {
  assert.equal(taskNotificationCandidate({ id: "1", name: "Vitres", dueDate: "2026-09-11", today: "2026-09-11" })?.messageKey, "notif_task_due");
  assert.equal(taskNotificationCandidate({ id: "1", name: "Vitres", dueDate: "2026-09-10", today: "2026-09-11" })?.messageKey, "notif_task_overdue");
  assert.equal(taskNotificationCandidate({ id: "1", name: "Vitres", dueDate: "2026-09-09", today: "2026-09-11" }), null);
  assert.ok(taskNotificationCandidate({ id: "1", name: "Vitres", dueDate: "2026-09-08", today: "2026-09-11" }));
});

test("Notifications V2 rappelle les factures à J-3, J0 puis à des jalons de retard", () => {
  assert.equal(billNotificationCandidate({ id: "b", label: "Électricité", dueOn: "2026-09-14", today: "2026-09-11" })?.messageKey, "notif_bill_due_soon");
  assert.equal(billNotificationCandidate({ id: "b", label: "Électricité", dueOn: "2026-09-11", today: "2026-09-11" })?.messageKey, "notif_bill_due_today");
  assert.equal(billNotificationCandidate({ id: "b", label: "Électricité", dueOn: "2026-09-09", today: "2026-09-11" }), null);
  assert.ok(billNotificationCandidate({ id: "b", label: "Électricité", dueOn: "2026-09-08", today: "2026-09-11" }));
});

test("Notifications V2 respecte le rappel calendrier configuré", () => {
  assert.ok(eventNotificationCandidate({ id: "e", title: "Dentiste", daysUntilOccurrence: 2, reminderDaysBefore: 2, hasTime: true }));
  assert.equal(eventNotificationCandidate({ id: "e", title: "Dentiste", daysUntilOccurrence: 0, reminderDaysBefore: 2, hasTime: true }), null);
  assert.ok(eventNotificationCandidate({ id: "e2", title: "Anniversaire", daysUntilOccurrence: 0, reminderDaysBefore: 2, hasTime: false }));
  assert.equal(eventNotificationCandidate({ id: "e", title: "Dentiste", daysUntilOccurrence: 1, reminderDaysBefore: 2, hasTime: true }), null);
});

test("Notifications V2 relie le digest calendrier a event_time pour eviter le doublon horaire", () => {
  const route = fs.readFileSync("app/api/daily-reminders/route.ts", "utf8");

  assert.match(
    route,
    /recurrence_end_date,\s*event_time,\s*reminder_days_before/
  );
  assert.match(
    route,
    /hasTime:\s*Boolean\(event\.event_time\)/
  );
});

test("Notifications V2 produit un digest unique et ouvre directement le bon onglet", () => {
  const task = taskNotificationCandidate({ id: "1", name: "Vitres", dueDate: "2026-09-11", today: "2026-09-11" })!;
  const task2 = taskNotificationCandidate({ id: "2", name: "Cuisine", dueDate: "2026-09-10", today: "2026-09-11" })!;
  assert.equal(buildDailyDigest([task, task2])?.url, "/app/taches");
  const bill = billNotificationCandidate({ id: "b", label: "Électricité", dueOn: "2026-09-11", today: "2026-09-11" })!;
  assert.equal(buildDailyDigest([task, bill])?.url, "/app");
});

test("Notifications V2 déduplique le Cron et transmet une destination au Service Worker", () => {
  const route = fs.readFileSync("app/api/daily-reminders/route.ts", "utf8");
  const sw = fs.readFileSync("public/sw.js", "utf8");
  const migration = fs.readFileSync("supabase/migrations/2026-09-11-notifications-v2-dedup.sql", "utf8");
  assert.match(route, /notification_deliveries/);
  assert.match(route, /claimError\.code === "23505"/);
  assert.match(route, /JSON\.stringify\(\{ title, body, url: digest\.url \}\)/);
  assert.match(sw, /data: \{ url: data\.url \|\| "\/app" \}/);
  assert.match(sw, /clients\.openWindow\(target\)/);
  assert.match(migration, /unique \(member_id, delivery_date\)/);
});

test("Notifications V2 garantit les permissions service_role du verrou anti-doublon", () => {
  const migration = fs.readFileSync(
    "supabase/migrations/2026-09-23-notification-deliveries-service-role.sql",
    "utf8"
  );
  assert.match(
    migration,
    /grant\s+insert\s*,\s*delete\s+on\s+table\s+public\.notification_deliveries\s+to\s+service_role\s*;/i
  );
});

test("Notifications V2 garde la marque DABO cohérente dans les titres push", () => {
  const i18n = fs.readFileSync("lib/i18n.ts", "utf8");
  const titles = [
    ...i18n.matchAll(/notif_(?:reminder|digest)_title:\s*"([^"]+)"/g),
  ].map((match) => match[1]);

  assert.equal(titles.length, 14);
  assert.ok(titles.every((title) => title.startsWith("DABO — ")));
  assert.doesNotMatch(i18n, /"Dabo —/);
});

test("Notifications V2 exclut Courses et Équilibre du Cron intelligent", () => {
  const route = fs.readFileSync("app/api/daily-reminders/route.ts", "utf8");
  assert.doesNotMatch(route, /from\("shopping_items"\)/);
  assert.doesNotMatch(route, /balance|equilibre|contribution/i);
});
