import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const page = fs.readFileSync(path.join(root, "app/app/foyer/page.tsx"), "utf8");
const i18n = fs.readFileSync(path.join(root, "lib/i18n.ts"), "utf8");

test("Mon foyer V2 devient une carte d identite vivante du foyer", () => {
  assert.match(page, /household_hub_identity/);
  assert.match(page, /household_hub_member_count/);
  assert.match(page, /members\.map/);
  assert.match(page, /<Avatar member=\{member\}/);
});

test("Mon foyer V2 donne un acces premium au bilan sans inventer de score", () => {
  assert.match(page, /household_hub_now_title/);
  assert.match(page, /router\.push\("\/app\/bilan"\)/);
  assert.match(page, /household_hub_control_note/);
  assert.doesNotMatch(page, /score\s*[=:]/i);
});

test("Mon foyer V2 conserve les acces Membres Equilibre et Reglages", () => {
  assert.match(page, /settings_members/);
  assert.match(page, /router\.push\("\/app\/equilibre"\)/);
  assert.match(page, /router\.push\("\/app\/reglages"\)/);
});

test("Mon foyer V2 reste traduit dans les 7 langues actives", () => {
  for (const key of [
    "household_hub_intro",
    "household_hub_identity",
    "household_hub_member_count",
    "household_hub_member",
    "household_hub_now_eyebrow",
    "household_hub_now_title",
    "household_hub_now_desc",
    "household_hub_open_report",
    "household_hub_control_note",
    "household_hub_tools",
  ]) {
    assert.equal((i18n.match(new RegExp(`\\b${key}:`, "g")) || []).length, 7, `${key} doit exister 7 fois`);
  }
});


test("Mon foyer V2 invite directement sans detour par Reglages", () => {
  assert.match(page, /setInviteOpen\(true\)/);
  assert.match(page, /role="dialog"/);
  assert.match(page, /QRCodeSVG/);
  assert.match(page, /copyInviteLink/);
  assert.match(page, /shareInvite/);
  assert.match(page, /\?invite=/);
});

test("Mon foyer V2 separe invitation et gestion des membres", () => {
  assert.match(page, /settings_invite_member/);
  assert.match(page, /\/app\/reglages#dabo-members/);
  assert.doesNotMatch(page, /onClick=\{\(\) => router\.push\("\/app\/reglages"\)\} className="dabo-secondary-action mt-4 w-full"/);
});
