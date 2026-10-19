import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { parseShoppingMemo, normalizeMemoName } from "../lib/shopping-memo-v5";

test("French memo separates articles, preserves quantities and never invents missing quantities", () => {
  const items = parseShoppingMemo("Prends deux bouteilles de lait, du riz et trois savons");
  assert.deepEqual(items.map(({ name, quantity }) => ({ name, quantity })), [
    { name: "lait", quantity: "2 bouteilles" }, { name: "riz", quantity: "" }, { name: "savons", quantity: "3" },
  ]);
});
test("memo supports numbers, units and newlines", () => {
  const items = parseShoppingMemo("2 kg pommes\n- 3 packs water\ncoffee");
  assert.equal(items.length, 3);
  assert.equal(items[0].quantity, "2 kg");
  assert.equal(items[1].quantity, "3 packs");
  assert.equal(items[2].quantity, "");
});
test("memo normalizes duplicate names and bounds input", () => {
  assert.equal(normalizeMemoName("  Café  "), normalizeMemoName("cafe"));
  assert.equal(parseShoppingMemo(Array(100).fill("milk").join("\n")).length, 60);
});
test("memo UI enforces editable confirmation and quantity persistence", () => {
  const source = fs.readFileSync("app/app/courses/page.tsx", "utf8");
  assert.match(source, /setMemoPreview\(parseShoppingMemo\(bulkImportText\)\)/);
  assert.match(source, /quantity: article\.quantity\.trim\(\) \|\| null/);
  assert.match(source, /setBulkImportError\(t\("courses_memo_duplicate_warning"\)\)/);
});
