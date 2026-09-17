import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const activation = fs.readFileSync("lib/notification-activation.ts", "utf8");
const notifications = fs.readFileSync("lib/notifications.ts", "utf8");
const settings = fs.readFileSync("app/app/reglages/page.tsx", "utf8");
const today = fs.readFileSync("app/app/page.tsx", "utf8");
const nudge = fs.readFileSync("components/NotificationActivationNudge.tsx", "utf8");
const i18n = fs.readFileSync("lib/i18n.ts", "utf8");

test("Notifications Activation guidée V1 vérifie navigateur ET abonnement Supabase avant d'afficher Activées", () => {
  assert.match(activation, /getSubscription\(\)/);
  assert.match(activation, /from\("push_subscriptions"\)/);
  assert.match(activation, /eq\("member_id", memberId\)/);
  assert.match(activation, /eq\("endpoint", subscription\.endpoint\)/);
  assert.match(settings, /hasVerifiedPushSubscription\(supabase, me\.id\)/);
});

test("Notifications Activation guidée V1 refuse de valider une activation non persistée", () => {
  assert.match(notifications, /if \(upsertError\) throw upsertError/);
  assert.match(notifications, /Push subscription|Abonnement push/);
  assert.match(nudge, /hasVerifiedPushSubscription\(supabase, memberId\)/);
});

test("Notifications Activation guidée V1 propose Activer, Plus tard et Non merci sur Aujourd'hui", () => {
  assert.match(today, /NotificationActivationNudge/);
  assert.match(nudge, /notification_nudge_enable/);
  assert.match(nudge, /notification_nudge_later/);
  assert.match(nudge, /notification_nudge_no/);
});

test("Notifications Activation guidée V1 relance Plus tard à J+1 et un premier refus à J+7 puis s'arrête au second", () => {
  assert.match(activation, /NOTIFICATION_LATER_MS = 24 \* 60 \* 60 \* 1000/);
  assert.match(activation, /NOTIFICATION_NO_THANKS_MS = 7 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(activation, /refusalCount >= 2/);
  assert.match(nudge, /preference\.stopped/);
  assert.match(settings, /stopNotificationNudge\(me\.user_id\)/);
});

test("Notifications Activation guidée V1 couvre les sept langues DABO", () => {
  assert.equal((i18n.match(/notification_nudge_title:/g) || []).length, 7);
  assert.equal((i18n.match(/notification_nudge_text:/g) || []).length, 7);
  assert.equal((i18n.match(/notification_nudge_enable:/g) || []).length, 7);
  assert.equal((i18n.match(/notification_nudge_later:/g) || []).length, 7);
  assert.equal((i18n.match(/notification_nudge_no:/g) || []).length, 7);
});
