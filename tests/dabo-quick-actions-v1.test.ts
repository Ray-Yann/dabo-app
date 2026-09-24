import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const nav = fs.readFileSync("components/DaboMainNav.tsx", "utf8");
const i18n = fs.readFileSync("lib/i18n.ts", "utf8");

test("Quick Actions V1 ajoute un hub d actions rapides dans Plus", () => {
  assert.match(nav, /quick_actions_title/);
  assert.match(nav, /quick_action_task/);
  assert.match(nav, /quick_action_shopping/);
  assert.match(nav, /quick_action_calendar/);
});

test("Quick Actions V1 reutilise les trois parcours canoniques first value", () => {
  assert.match(nav, /\/app\/taches\?first=1/);
  assert.match(nav, /\/app\/courses\?first=1/);
  assert.match(nav, /\/app\/calendrier\?first=1/);
});

test("Quick Actions V1 reste dans Plus sans modifier les quatre onglets personnalisables", () => {
  assert.match(nav, /const DEFAULT_TABS: TabKey\[\] = \["tasks", "courses", "calendar", "finances"\]/);
  assert.match(nav, /const hidden = TAB_KEYS\.filter/);
  assert.match(nav, /moreOpen/);
});

test("Quick Actions V1 couvre les sept langues DABO", () => {
  for (const key of [
    "quick_actions_title",
    "quick_action_task",
    "quick_action_shopping",
    "quick_action_calendar",
  ]) {
    const count = [...i18n.matchAll(new RegExp(key + ":", "g"))].length;
    assert.equal(count, 7, key + " doit exister exactement une fois dans chacune des 7 langues");
  }
});
