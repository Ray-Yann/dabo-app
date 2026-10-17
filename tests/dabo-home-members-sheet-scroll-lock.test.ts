import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("app/app/page.tsx", "utf8");

test("members dialog prevents background scrolling and restores prior overflow", () => {
  assert.match(source, /const previousBodyOverflow = document\.body\.style\.overflow/);
  assert.match(source, /document\.body\.style\.overflow = "hidden"/);
  assert.match(source, /document\.body\.style\.overflow = previousBodyOverflow/);
});

test("members trigger exposes expanded state and identifies the dialog", () => {
  assert.match(source, /aria-haspopup="dialog" aria-expanded=\{membersOpen\} aria-controls="dabo-members-dialog"/);
  assert.match(source, /id="dabo-members-dialog" ref=\{membersDialogRef\}/);
});
