import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const nav = fs.readFileSync("components/DaboMainNav.tsx", "utf8");
const css = fs.readFileSync("app/globals.css", "utf8");
const i18n = fs.readFileSync("lib/i18n.ts", "utf8");

test("Navigation V2 fixe les cinq destinations validées", () => {
  assert.match(nav, /key: "today"/);
  assert.match(nav, /key: "planning"/);
  assert.match(nav, /key: "add"/);
  assert.match(nav, /key: "household"/);
  assert.match(nav, /key: "more"/);
  assert.match(nav, /grid-cols-5/);
});

test("Navigation V2 garde un plus central universel et les ajouts rapides", () => {
  assert.match(nav, /dabo-main-nav-add-circle/);
  assert.match(nav, /add_sheet_title/);
  assert.match(nav, /\/app\/taches\?first=1/);
  assert.match(nav, /\/app\/courses\?first=1/);
  assert.match(nav, /\/app\/calendrier\?first=1/);
  assert.match(nav, /\/app\/finances\?first=1/);
});

test("Navigation V2 respecte safe area et surface premium", () => {
  assert.match(css, /dabo-main-nav-v2/);
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /backdrop-filter: blur/);
});

test("Navigation V2 couvre les sept catalogues", () => {
  for (const key of ["tab_planning", "tab_add", "tab_my_household", "add_sheet_title"]) {
    assert.equal([...i18n.matchAll(new RegExp(key + ":", "g"))].length, 7);
  }
});
