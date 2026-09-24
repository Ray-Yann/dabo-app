import test from "node:test";
import assert from "node:assert/strict";
import { newlyAssignedMemberIds } from "../lib/notification-assignment-targeting";

test("Assignment Targeting V1 notifie une nouvelle attribution", () => {
  assert.deepEqual(
    newlyAssignedMemberIds([], ["member-b"], "member-a"),
    ["member-b"]
  );
});

test("Assignment Targeting V1 ne notifie jamais l auteur lui-meme", () => {
  assert.deepEqual(
    newlyAssignedMemberIds([], ["member-a"], "member-a"),
    []
  );
});

test("Assignment Targeting V1 deduplique les sous-taches d une meme personne", () => {
  assert.deepEqual(
    newlyAssignedMemberIds(
      [],
      ["member-b", "member-b", "member-c", "member-b"],
      "member-a"
    ),
    ["member-b", "member-c"]
  );
});

test("Assignment Targeting V1 ne renotifie pas une attribution inchangee", () => {
  assert.deepEqual(
    newlyAssignedMemberIds(
      ["member-b", "member-c"],
      ["member-b", "member-c"],
      "member-a"
    ),
    []
  );
});

test("Assignment Targeting V1 ne notifie que le nouveau membre lors d une reattribution partielle", () => {
  assert.deepEqual(
    newlyAssignedMemberIds(
      ["member-b", "member-c"],
      ["member-c", "member-d"],
      "member-a"
    ),
    ["member-d"]
  );
});

test("Assignment Targeting V1 ignore les valeurs nulles ou vides", () => {
  assert.deepEqual(
    newlyAssignedMemberIds(
      [null, "", "member-b"],
      ["", null, "member-b", "member-c"],
      "member-a"
    ),
    ["member-c"]
  );
});
