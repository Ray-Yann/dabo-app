import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const sendRoute = fs.readFileSync("app/api/send-notification/route.ts", "utf8");
const onboarding = fs.readFileSync("app/page.tsx", "utf8");
const home = fs.readFileSync("app/app/page.tsx", "utf8");
const i18n = fs.readFileSync("lib/i18n.ts", "utf8");

test("Notifications Recovery V1 retrouve les abonnements d'un compte dans tous ses profils multi-foyers", () => {
  assert.match(sendRoute, /\.eq\("user_id", member\.user_id\)/);
  assert.match(sendRoute, /\.in\("member_id", accountMemberIds\)/);
});

test("Notifications Recovery V1 déduplique un même terminal avant envoi", () => {
  assert.match(sendRoute, /deliveredEndpoints = new Set<string>\(\)/);
  assert.match(sendRoute, /deliveredEndpoints\.has\(sub\.endpoint\)/);
});

test("Notifications Recovery V1 restaure la notification quand un membre rejoint le foyer", () => {
  assert.match(sendRoute, /notif_member_joined/);
  assert.match(onboarding, /notifyHousehold\(supabase, joinResult\[0\]\.household_id, joinResult\[0\]\.member_id, "notif_member_joined"/);
});

test("Notifications Recovery V1 notifie aussi un achat terminé depuis Aujourd'hui", () => {
  assert.match(home, /notifyHousehold\(supabase, household\.id, me\.id, "notif_item_bought"/);
});

test("Notifications Recovery V1 traduit l'arrivée d'un membre dans les sept catalogues", () => {
  assert.equal((i18n.match(/notif_member_joined:/g) || []).length, 7);
});
