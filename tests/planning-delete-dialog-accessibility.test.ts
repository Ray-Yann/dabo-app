import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("app/app/calendrier/page.tsx", "utf8");

test("Planning delete confirmation retains an accessible named modal", () => {
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /aria-labelledby="calendar-delete-title"/);
  assert.match(source, /ref=\{deleteDialogRef\}/);
});

test("Planning delete confirmation supports Escape and trapped Tab navigation", () => {
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /event\.key !== "Tab"/);
  assert.match(source, /event\.shiftKey/);
  assert.match(source, /document\.addEventListener\("keydown", onKeyDown\)/);
  assert.match(source, /document\.removeEventListener\("keydown", onKeyDown\)/);
});

test("Planning delete confirmation restores focus and page scrolling", () => {
  assert.match(source, /deleteTriggerRef\.current\?\.focus\(\)/);
  assert.match(source, /document\.body\.style\.overflow = "hidden"/);
  assert.match(source, /document\.body\.style\.overflow = previousOverflow/);
});
