import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("app/app/page.tsx", "utf8");

test("Home V1.2 ajoute une vue rapide du foyer compacte", () => {
  assert.match(page, /data-testid="household-quick-view"/);
  assert.match(page, /grid grid-cols-2 gap-2/);
  assert.match(page, /today_household_quick_view/);
});

test("Home V1.2 couvre tâches, courses, calendrier et budget sans dupliquer Attention Engine", () => {
  assert.match(page, /key: "tasks"/);
  assert.match(page, /key: "shopping"/);
  assert.match(page, /key: "calendar"/);
  assert.match(page, /key: "budget"/);
  assert.equal((page.match(/selectHouseholdAttention/g) || []).length, 2);
});

test("Home V1.2 compte les courses du foyer et non seulement celles du membre courant", () => {
  assert.match(page, /activeHouseholdShoppingCount/);
  assert.match(page, /\.eq\("status", "to_buy"\)/);
});
