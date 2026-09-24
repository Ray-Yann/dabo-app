import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("app/api/daily-reminders/route.ts", "utf8");

test("Daily Reminders V1 calcule la date civile dans le fuseau opérationnel DABO", () => {
  assert.match(source, /function localDate\(/);
  assert.match(source, /Intl\.DateTimeFormat/);
  assert.match(source, /Europe\/Brussels/);
});

test("Daily Reminders V1 ne calcule plus today avec toISOString UTC", () => {
  assert.doesNotMatch(
    source,
    /const today = new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/
  );
});

test("Daily Reminders V1 calcule J+3 à partir de la date civile", () => {
  assert.match(source, /addCivilDays\(today, 3\)/);
  assert.doesNotMatch(
    source,
    /new Date\(Date\.now\(\) \+ 3 \* 86_400_000\)\.toISOString\(\)\.slice\(0,\s*10\)/
  );
});

test("Daily Reminders V1 conserve checked_at comme horodatage UTC technique", () => {
  assert.match(source, /checked_at: new Date\(\)\.toISOString\(\)/);
});
