import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isAppearance, resolveDark } from "../lib/dabo-appearance";
const read = (path: string) => readFileSync(path, "utf8");
test("V3.2 preserves legacy dark mode until user chooses a preference", () => {
  assert.equal(resolveDark(null, true, false), true);
  assert.equal(resolveDark(null, false, true), false);
  assert.equal(resolveDark("auto", false, true), true);
  assert.equal(resolveDark("light", true, true), false);
  assert.equal(resolveDark("dark", false, false), true);
  assert.equal(isAppearance("invalid"), false);
});
test("V3.2 appearance is shared by the app shell and translated in seven languages", () => {
  const shell = read("app/app/layout.tsx");
  const control = read("components/DaboAppearanceControl.tsx");
  assert.match(shell, /DaboAppearanceControl/);
  for (const lang of ["fr", "nl", "en", "de", "es", "it", "pt"]) assert.ok(control.includes(`${lang}: [`));
});
test("V3.2 uses contextual cards and avatars, not member urgency colors", () => {
  const home = read("app/app/page.tsx");
  assert.match(home, /dabo-semantic-today/);
  assert.match(home, /dabo-semantic-upcoming/);
  assert.match(home, /dabo-semantic-equity/);
  assert.match(home, /<Avatar member=/);
});
