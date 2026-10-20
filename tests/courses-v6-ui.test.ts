import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("app/app/courses/page.tsx", "utf8");
const styles = readFileSync("app/globals.css", "utf8");
const translations = readFileSync("lib/i18n.ts", "utf8");

test("Courses V6 keeps the existing shopping entrypoints", () => {
  for (const token of ["parseShoppingMemo", "DaboScanView", "NearbyStoresPanel", "importShoppingList", "toggle(item)", "courses_memo_preview_action"]) {
    assert.ok(page.includes(token), `Missing existing behavior: ${token}`);
  }
});

test("Courses V6 supports grouping, searching and shopping mode", () => {
  for (const token of ["shoppingGrouping", "filteredToBuy", "shoppingSearch", "shoppingSessionIds", "dabo-courses-mode-button", "shoppingCategory(item.name, t)"]) {
    assert.ok(page.includes(token), `Missing feature: ${token}`);
  }
  assert.match(page, /aria-pressed=\{shoppingGrouping === "category"\}/);
  assert.match(page, /role="progressbar"/);
});

test("Courses V6 design is theme-aware and responsive", () => {
  assert.match(styles, /\.dabo-courses-overview/);
  assert.match(styles, /\.dabo-courses-basket/);
  assert.match(styles, /@media \(max-width: 540px\)/);
  assert.match(styles, /var\(--color-white2\)/);
});

test("Courses V6 UI keys exist in all seven locales", () => {
  assert.equal((translations.match(/courses_v6_shop_mode:/g) || []).length, 7);
  assert.equal((translations.match(/courses_v6_other:/g) || []).length, 7);
});
