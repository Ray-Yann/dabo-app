import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("lib/server-event-notifications.ts", "utf8");

test("Event Notifications V1 centralise la destination selon la clé", () => {
  assert.match(source, /function notificationUrlForKey\(/);
});

test("Event Notifications V1 dirige les tâches vers Tâches", () => {
  assert.match(source, /key\.startsWith\("notif_task_"\)[\s\S]*?"\/app\/taches"/);
});

test("Event Notifications V1 dirige les courses vers Courses", () => {
  assert.match(source, /key\.startsWith\("notif_item_"\)[\s\S]*?"\/app\/courses"/);
});

test("Event Notifications V1 dirige les factures vers Finances", () => {
  assert.match(source, /key === "notif_bill_paid"[\s\S]*?"\/app\/finances"/);
});

test("Event Notifications V1 dirige les événements membres vers Réglages", () => {
  assert.match(source, /key\.startsWith\("notif_member_"\)[\s\S]*?"\/app\/reglages"/);
  assert.match(source, /key === "notif_creator_promoted"[\s\S]*?"\/app\/reglages"/);
});

test("Event Notifications V1 transmet la destination au service worker", () => {
  assert.match(source, /JSON\.stringify\(\{ title, body, url \}\)/);
});
