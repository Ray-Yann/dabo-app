import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const sendRoute = fs.readFileSync("app/api/send-notification/route.ts", "utf8");
const notifications = fs.readFileSync("lib/notifications.ts", "utf8");
const i18n = fs.readFileSync("lib/i18n.ts", "utf8");

test("Notifications Targeted V1 conserve la verification du membre appelant dans le foyer", () => {
  assert.match(sendRoute, /\.eq\("id", excludeMemberId\)/);
  assert.match(sendRoute, /\.eq\("household_id", householdId\)/);
  assert.match(sendRoute, /\.eq\("user_id", userData\.id\)/);
  assert.match(sendRoute, /\.is\("left_at", null\)/);
});

test("Notifications Targeted V1 accepte une liste explicite de membres cibles", () => {
  assert.match(sendRoute, /targetMemberIds/);
  assert.match(sendRoute, /\.in\("id", targetMemberIds\)/);
});

test("Notifications Targeted V1 expose un helper client cible sans remplacer le broadcast", () => {
  assert.match(notifications, /export async function notifyHousehold\(/);
  assert.match(notifications, /export async function notifyMembers\(/);
  assert.match(notifications, /targetMemberIds/);
});

test("Notifications Targeted V1 autorise les attributions de taches et de courses", () => {
  assert.match(sendRoute, /notif_task_assigned/);
  assert.match(sendRoute, /notif_item_assigned/);
});

test("Notifications Targeted V1 traduit les deux attributions dans les sept catalogues", () => {
  assert.equal((i18n.match(/notif_task_assigned:/g) || []).length, 7);
  assert.equal((i18n.match(/notif_item_assigned:/g) || []).length, 7);
});


test("Notifications Targeted V1 impose un destinataire aux notifications d attribution", () => {
  assert.match(
    sendRoute,
    /TARGETED_ONLY_KEYS[\s\S]*notif_task_assigned[\s\S]*notif_item_assigned/
  );
  assert.match(
    sendRoute,
    /TARGETED_ONLY_KEYS\.includes\(key\)[\s\S]*targetMemberIds/
  );
});
