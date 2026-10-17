import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/app/finances/page.tsx", import.meta.url), "utf8");

test("finance default date uses local calendar components rather than UTC", () => {
  const helper = source.match(/function todayKey\(\) \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(helper, "todayKey helper must exist");
  assert.match(helper, /getFullYear\(\)/);
  assert.match(helper, /getMonth\(\)/);
  assert.match(helper, /getDate\(\)/);
  assert.doesNotMatch(helper, /toISOString\(/);
});

test("finance payment and creation use the same local date helper", () => {
  assert.match(source, /useState\(todayKey\(\)\)/);
  assert.match(source, /p_paid_on:todayKey\(\)/);
});
