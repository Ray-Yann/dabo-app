import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("app/app/page.tsx", "utf8");

test("member sheet closes with Escape and unregisters its listener", () => {
  assert.match(page, /if \(!membersOpen\) return;/);
  assert.match(page, /event\.key === "Escape"/);
  assert.match(page, /window\.addEventListener\("keydown", onEscape\)/);
  assert.match(page, /window\.removeEventListener\("keydown", onEscape\)/);
});

test("member sheet closes before navigating to household management", () => {
  assert.match(page, /setMembersOpen\(false\); router\.push\("\/app\/foyer"\)/);
  assert.match(page, /aria-label=\{t\("close"\)\}/);
});
