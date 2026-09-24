import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("app/api/send-notification/route.ts", "utf8");
const tasks = fs.readFileSync("app/app/taches/page.tsx", "utf8");
const shopping = fs.readFileSync("app/app/courses/page.tsx", "utf8");
const i18n = fs.readFileSync("lib/i18n.ts", "utf8");

test("Comment Notifications V1 autorise les deux nouvelles cles serveur", () => {
  assert.match(route, /"notif_task_comment"/);
  assert.match(route, /"notif_item_comment"/);
});

test("Comment Notifications V1 exige un ciblage pour les commentaires", () => {
  const targetedBlock =
    route.match(/TARGETED_ONLY_KEYS[\s\S]*?\];/)?.[0] ?? "";

  assert.match(targetedBlock, /"notif_task_comment"/);
  assert.match(targetedBlock, /"notif_item_comment"/);
});

test("Comment Notifications V1 traduit les deux notifications dans les 7 langues", () => {
  assert.equal(
    (i18n.match(/notif_task_comment:/g) ?? []).length,
    7
  );
  assert.equal(
    (i18n.match(/notif_item_comment:/g) ?? []).length,
    7
  );
});

test("Comment Notifications V1 cable les commentaires de Taches", () => {
  assert.match(
    tasks,
    /notification-comment-targeting/
  );
  assert.match(
    tasks,
    /commentNotificationRecipientIds\(/
  );
  assert.match(
    tasks,
    /notifyMembers\([\s\S]*?"notif_task_comment"/
  );
});

test("Comment Notifications V1 cable les commentaires de Courses", () => {
  assert.match(
    shopping,
    /notification-comment-targeting/
  );
  assert.match(
    shopping,
    /commentNotificationRecipientIds\(/
  );
  assert.match(
    shopping,
    /notifyMembers\([\s\S]*?"notif_item_comment"/
  );
});

test("Comment Notifications V1 ne notifie qu apres une insertion reussie", () => {
  assert.match(
    tasks,
    /error:\s*commentInsertError/
  );
  assert.match(
    tasks,
    /if\s*\(commentInsertError\)/
  );

  assert.match(
    shopping,
    /error:\s*commentInsertError/
  );
  assert.match(
    shopping,
    /if\s*\(commentInsertError\)/
  );
});
