import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const home = fs.readFileSync("app/app/page.tsx", "utf8");

test("household members sheet supports Escape and cleans up its listener", () => {
  assert.match(home, /if \(!membersOpen\) return;/);
  assert.match(home, /event\.key === "Escape"/);
  assert.match(home, /window\.addEventListener\("keydown", onEscape\)/);
  assert.match(home, /window\.removeEventListener\("keydown", onEscape\)/);
});

test("members sheet close control has a localized accessible label", () => {
  assert.match(home, /aria-label=\{t\("close"\)\}/);
});

test("navigating from the sheet closes it first", () => {
  assert.match(home, /className="dabo-premium-manage" onClick=\{\(\) => \{ setMembersOpen\(false\); router\.push\("\/app\/foyer"\); \}\}/);
});

test("members dialog keeps keyboard focus inside and restores it on close", () => {
  assert.match(home, /ref=\{membersDialogRef\}.*role="dialog"/);
  assert.match(home, /ref=\{membersTriggerRef\}.*className="dabo-premium-avatars"/);
  assert.match(home, /event\.key !== "Tab"/);
  assert.match(home, /event\.shiftKey/);
  assert.match(home, /previousFocus\?\.isConnected/);
  assert.match(home, /window\.removeEventListener\("keydown", onEscape\)/);
});
