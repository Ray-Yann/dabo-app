import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("app/app/page.tsx", "utf8");

test("members dialog is labelled by its visible localized heading", () => {
  assert.match(source, /role="dialog" aria-modal="true" aria-labelledby="dabo-members-dialog-title"/);
  assert.match(source, /<h2 id="dabo-members-dialog-title">\{t\("settings_members"\)\}<\/h2>/);
});

test("member entries expose list semantics without changing visual rows", () => {
  assert.match(source, /<div role="list" aria-label=\{t\("settings_members"\)\}>/);
  assert.match(source, /role="listitem" className="dabo-premium-member-row"/);
});
