import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("app/app/foyer/page.tsx", "utf8");

test("household invite dialog has a named accessible modal and explicit trigger state", () => {
  assert.match(page, /ref=\{inviteDialogRef\} tabIndex=\{-1\} role="dialog" aria-modal="true" aria-labelledby="household-invite-title"/);
  assert.match(page, /ref=\{inviteTriggerRef\} type="button" aria-haspopup="dialog" aria-expanded=\{inviteOpen\}/);
});

test("household invite dialog supports Escape and traps Tab navigation", () => {
  assert.match(page, /event\.key === "Escape"/);
  assert.match(page, /event\.key === "Tab"/);
  assert.match(page, /event\.shiftKey/);
  assert.match(page, /window\.addEventListener\("keydown", onKeyDown\)/);
  assert.match(page, /window\.removeEventListener\("keydown", onKeyDown\)/);
});

test("household invite dialog restores focus and scroll after closing", () => {
  assert.match(page, /document\.body\.style\.overflow = "hidden"/);
  assert.match(page, /document\.body\.style\.overflow = previousOverflow/);
  assert.match(page, /previousFocus\?\.isConnected/);
  assert.match(page, /previousFocus\.focus\(\)/);
});
