import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const notifications = fs.readFileSync("lib/notifications.ts", "utf8");
const nudge = fs.readFileSync("components/NotificationActivationNudge.tsx", "utf8");
const settings = fs.readFileSync("app/app/reglages/page.tsx", "utf8");
const i18n = fs.readFileSync("lib/i18n.ts", "utf8");

test("Notifications iOS PWA V1 détecte iPhone/iPad et le mode écran d'accueil", () => {
  assert.match(notifications, /iPad\|iPhone\|iPod/);
  assert.match(notifications, /maxTouchPoints > 1/);
  assert.match(notifications, /display-mode: standalone/);
  assert.match(notifications, /requiresIosHomeScreenInstall/);
});

test("Notifications iOS PWA V1 ne lance pas requestPermission dans Safari iOS non installé", () => {
  const guard = notifications.indexOf("requiresIosHomeScreenInstall()")
  const request = notifications.indexOf("Notification.requestPermission()")
  assert.ok(guard >= 0 && request > guard);
});

test("Notifications iOS PWA V1 guide l'installation au lieu d'afficher une erreur générique", () => {
  assert.match(nudge, /notification_nudge_ios_install/);
  assert.match(nudge, /notification_nudge_ios_button/);
  assert.match(settings, /settings_notifications_ios_install/);
  assert.match(settings, /ios-install/);
});

test("Notifications iOS PWA V1 couvre les sept langues DABO", () => {
  assert.equal((i18n.match(/notification_nudge_ios_install:/g) || []).length, 7);
  assert.equal((i18n.match(/notification_nudge_ios_button:/g) || []).length, 7);
  assert.equal((i18n.match(/settings_notifications_ios_install:/g) || []).length, 7);
});
