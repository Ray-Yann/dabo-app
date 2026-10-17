import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseShoppingFinanceAmount } from "../lib/shopping-finance";

test("Courses → Finances accepts ordinary EUR formats without losing cents", () => {
  for (const [input, expected] of [["12,50", 12.5], ["12.50", 12.5], ["1 234,56 €", 1234.56], ["1\u202f234,56€", 1234.56], ["0,01", 0.01]] as const) {
    assert.equal(parseShoppingFinanceAmount(input), expected);
  }
});
test("Courses → Finances refuses ambiguous, negative or overprecise values", () => {
  for (const input of ["", "€", "0", "-1", "1,234", "1.234,56", "1e3", "Infinity", "1€2", "12,", "1,2,3"]) {
    assert.equal(parseShoppingFinanceAmount(input), null, input);
  }
});
test("Postpone and dismiss only close after a successful scoped database update", () => {
  const source = readFileSync(new URL("../app/app/courses/page.tsx", import.meta.url), "utf8");
  for (const action of ["postponeShoppingFinance", "dismissShoppingFinance"]) {
    const section = source.split(`async function ${action}()`)[1]?.split("\n  async function ")[0]?.split("\n  const loadItems")[0];
    assert.ok(section, action);
    assert.match(section, /\.eq\("household_id", shoppingFinanceSession\.household_id\)/);
    assert.match(section, /\.eq\("state", "pending"\)\.select\("id"\)\.single\(\)/);
    assert.match(section, /if \(error\) \{ setShoppingFinanceError\(t\("courses_finance_save_error"\)\); return; \}/);
  }
});
