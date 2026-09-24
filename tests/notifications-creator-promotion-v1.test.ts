import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const settings = fs.readFileSync("app/app/reglages/page.tsx", "utf8");
const leaveRoute = fs.readFileSync("app/api/leave-household/route.ts", "utf8");
const removeRoute = fs.readFileSync("app/api/remove-member/route.ts", "utf8");
const deleteRoute = fs.readFileSync("app/api/delete-account/route.ts", "utf8");
const i18n = fs.readFileSync("lib/i18n.ts", "utf8");

const promotionRoutePath = "app/api/promote-member/route.ts";
const promotionRoute = fs.existsSync(promotionRoutePath)
  ? fs.readFileSync(promotionRoutePath, "utf8")
  : "";

test("Creator Promotion V1 fait passer la promotion manuelle par une route serveur", () => {
  assert.match(settings, /fetch\("\/api\/promote-member"/);
  assert.doesNotMatch(
    settings,
    /supabase\.rpc\("promote_household_member_to_creator"/
  );
});

test("Creator Promotion V1 vérifie côté serveur l'appelant et la cible", () => {
  assert.match(promotionRoute, /verifyUserToken\(token\)/);
  assert.match(promotionRoute, /caller[\s\S]*role !== "creator"/);
  assert.match(promotionRoute, /target[\s\S]*household_id/);
  assert.match(promotionRoute, /target\.role === "creator"/);
});

test("Creator Promotion V1 exécute le RPC avec le contexte utilisateur authentifié", () => {
  assert.match(promotionRoute, /createUserClient\(token\)/);
  assert.match(
    promotionRoute,
    /rpc\(\s*"promote_household_member_to_creator"[\s\S]*p_member_id: memberId/
  );
});

test("Creator Promotion V1 cible uniquement le membre réellement promu", () => {
  assert.match(
    promotionRoute,
    /sendEventNotification\([\s\S]*targetMemberIds: \[memberId\][\s\S]*key: "notif_creator_promoted"/
  );
});

test("Creator Promotion V1 protège la notification manuelle contre le rejeu", () => {
  assert.match(
    promotionRoute,
    /eventDeliveryKey: `creator_promoted:\$\{[^}]+\}:\$\{memberId\}`/
  );
});

test("Creator Promotion V1 notifie une vraie promotion automatique après un départ", () => {
  assert.match(
    leaveRoute,
    /const \{ promotedMemberId \} = await transferCreatorAndArchive[\s\S]*if \(promotedMemberId\)[\s\S]*targetMemberIds: \[promotedMemberId\][\s\S]*key: "notif_creator_promoted"/
  );
});

test("Creator Promotion V1 couvre aussi le retrait par un autre créateur", () => {
  assert.match(
    removeRoute,
    /const \{ promotedMemberId \} = await transferCreatorAndArchive[\s\S]*if \(promotedMemberId\)[\s\S]*targetMemberIds: \[promotedMemberId\][\s\S]*key: "notif_creator_promoted"/
  );
});

test("Creator Promotion V1 couvre la suppression de compte dans chaque foyer", () => {
  assert.match(deleteRoute, /select\("id, household_id"\)/);
  assert.match(
    deleteRoute,
    /const \{ promotedMemberId \} = await transferCreatorAndArchive[\s\S]*if \(promotedMemberId\)[\s\S]*targetMemberIds: \[promotedMemberId\][\s\S]*key: "notif_creator_promoted"/
  );
});

test("Creator Promotion V1 ne laisse jamais un échec de push bloquer l'action principale", () => {
  assert.match(promotionRoute, /catch \(notificationError\)/);
  assert.match(leaveRoute, /catch \(notificationError\)/);
  assert.match(removeRoute, /catch \(notificationError\)/);
  assert.match(deleteRoute, /catch \(notificationError\)/);
});

test("Creator Promotion V1 traduit le message dans les sept catalogues", () => {
  const matches = i18n.match(/notif_creator_promoted:/g) || [];
  assert.equal(matches.length, 7);
});
