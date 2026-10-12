import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const home = readFileSync("app/app/page.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");

test("V3.1 day summary exposes three real, accessible destinations", () => {
  assert.match(home, /dabo-v31-day-summary/);
  assert.match(home, /summaryPendingTasks = tasks.filter/);
  assert.match(home, /summaryShoppingItems = items.filter/);
  assert.match(home, /summaryDueBills = financeBills.filter/);
  assert.match(home, /aria-label=\{`\$\{summaryLabels\.tasks\}/);
  for (const route of ["/app/taches", "/app/courses", "/app/finances"]) {
    assert.match(home, new RegExp(`router\\.push\\("${route}"\\)`));
  }
});

test("V3.1 never treats global household shopping count as a private member list", () => {
  assert.match(home, /summaryShoppingItems = items.filter/);
  assert.doesNotMatch(home, /summaryShoppingItems = activeHouseholdShoppingCount/);
});

test("V3.1 labels and responsive styles cover seven enabled languages", () => {
  for (const lang of ["fr", "nl", "en", "de", "es", "it", "pt"]) {
    assert.match(home, new RegExp(`\\b${lang}: \{ title:`));
  }
  assert.match(css, /\.dabo-v31-day-grid/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
