import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const home = readFileSync("app/app/page.tsx", "utf8");
const courses = readFileSync("app/app/courses/page.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");
const loba = readFileSync("components/LobaHouseholdChat.tsx", "utf8");
test("V3.2 displays six functional shortcuts ahead of the hero", () => {
  for (const id of ["tasks", "shopping", "finance", "balance", "loba", "scan"]) assert.match(home, new RegExp(`id: "${id}"`));
  assert.ok(home.indexOf('className="dabo-v32-shortcuts"') < home.indexOf('className="dabo-v3-hero"'));
  assert.match(css, /overflow-x:auto/);
});
test("V3.2 uses real upcoming occurrences and does not call them suggestions", () => {
  assert.match(home, /nextUncompletedOccurrence\(event, completedOccurrenceKeys\)/);
  assert.match(home, /upcomingEvents\.map/);
  assert.match(home, /insight\.type === "assignment"/);
  assert.match(home, /preparingInsight &&/);
});
test("V3.2 previews actual shopping item names", () => {
  assert.match(home, /items\.filter\(\(item\) => item\.status === "to_buy"\)/);
  assert.match(home, /pendingShoppingPreview\.map/);
  assert.match(home, /\{item\.name\}/);
});
test("V3.2 shortcut opens existing LOBA and scan workflows", () => {
  assert.match(home, /<LobaHouseholdChat householdName=\{household\.name\} initialOpen/);
  assert.match(loba, /initialOpen\?: boolean/);
  assert.match(home, /\/app\/courses\?scan=1/);
  assert.match(courses, /searchParams\.get\("scan"\)/);
});
