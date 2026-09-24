import test from "node:test";
import assert from "node:assert/strict";
import { commentNotificationRecipientIds } from "../lib/notification-comment-targeting";

test("Comment Targeting V1 notifie le membre assigne", () => {
  assert.deepEqual(
    commentNotificationRecipientIds({
      actorMemberId: "member-a",
      assignedMemberIds: ["member-b"],
      previousCommentAuthorIds: [],
    }),
    ["member-b"]
  );
});

test("Comment Targeting V1 notifie un participant precedent", () => {
  assert.deepEqual(
    commentNotificationRecipientIds({
      actorMemberId: "member-a",
      assignedMemberIds: [],
      previousCommentAuthorIds: ["member-c"],
    }),
    ["member-c"]
  );
});

test("Comment Targeting V1 combine assignes et participants sans doublons", () => {
  assert.deepEqual(
    commentNotificationRecipientIds({
      actorMemberId: "member-a",
      assignedMemberIds: ["member-b", "member-c", "member-b"],
      previousCommentAuthorIds: ["member-c", "member-d", "member-b"],
    }),
    ["member-b", "member-c", "member-d"]
  );
});

test("Comment Targeting V1 ne notifie jamais auteur du nouveau commentaire", () => {
  assert.deepEqual(
    commentNotificationRecipientIds({
      actorMemberId: "member-a",
      assignedMemberIds: ["member-a", "member-b"],
      previousCommentAuthorIds: ["member-a", "member-c"],
    }),
    ["member-b", "member-c"]
  );
});

test("Comment Targeting V1 ignore les identifiants absents", () => {
  assert.deepEqual(
    commentNotificationRecipientIds({
      actorMemberId: "member-a",
      assignedMemberIds: [null, "", undefined, "member-b"],
      previousCommentAuthorIds: ["", null, "member-c", undefined],
    }),
    ["member-b", "member-c"]
  );
});

test("Comment Targeting V1 reste silencieux sans destinataire pertinent", () => {
  assert.deepEqual(
    commentNotificationRecipientIds({
      actorMemberId: "member-a",
      assignedMemberIds: [null, "member-a"],
      previousCommentAuthorIds: ["member-a", null],
    }),
    []
  );
});
