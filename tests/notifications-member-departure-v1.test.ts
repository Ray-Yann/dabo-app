import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const leaveRoute = fs.readFileSync("app/api/leave-household/route.ts", "utf8");
const removeRoute = fs.readFileSync("app/api/remove-member/route.ts", "utf8");
const sendRoute = fs.readFileSync("app/api/send-notification/route.ts", "utf8");
const i18n = fs.readFileSync("lib/i18n.ts", "utf8");

test("Member Departure Notifications V1 distingue départ volontaire et retrait", () => {
  assert.match(leaveRoute, /notif_member_left/);
  assert.match(removeRoute, /notif_member_removed/);
});

test("Member Departure Notifications V1 récupère le prénom côté serveur avant archivage", () => {
  assert.match(leaveRoute, /select\("[^"]*first_name[^"]*"\)/);
  assert.match(removeRoute, /select\("[^"]*first_name[^"]*"\)/);
});

test("Member Departure Notifications V1 ne notifie le départ volontaire que pour un membre actif réellement archivé", () => {
  assert.match(
    leaveRoute,
    /if \(member\)[\s\S]*await transferCreatorAndArchive\(admin, member\.id\)[\s\S]*notif_member_left/
  );
});

test("Member Departure Notifications V1 notifie le retrait seulement après archivage réussi", () => {
  assert.match(
    removeRoute,
    /await transferCreatorAndArchive\(admin, target\.id\)[\s\S]*notif_member_removed/
  );
});

test("Member Departure Notifications V1 exclut l'auteur du retrait des destinataires", () => {
  assert.match(
    removeRoute,
    /notif_member_removed[\s\S]*excludeMemberId:\s*caller\.id|excludeMemberId:\s*caller\.id[\s\S]*notif_member_removed/
  );
});

test("Member Departure Notifications V1 utilise une primitive serveur partagée", () => {
  assert.match(leaveRoute, /sendEventNotification/);
  assert.match(removeRoute, /sendEventNotification/);
  assert.match(sendRoute, /sendEventNotification/);
});

test("Member Departure Notifications V1 traduit les deux événements dans les sept catalogues", () => {
  assert.equal((i18n.match(/notif_member_left:/g) || []).length, 7);
  assert.equal((i18n.match(/notif_member_removed:/g) || []).length, 7);
});
