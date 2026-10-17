import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("app/app/finances/page.tsx", "utf8");

test("Finance reports the complete pending bill count, not just the eight visible rows", () => {
  assert.match(source, /const periodBills=bills\.filter\(/);
  assert.match(source, /const visibleBills=periodBills\.slice\(0,8\)/);
  assert.match(source, /periodBills\.length===1/);
  assert.doesNotMatch(source, /visibleBills\.length===1/);
});

test("Finance errors remain visible outside the overview and are announced accessibly", () => {
  const errorPosition = source.indexOf('{error&&<div role="alert"');
  const overviewEnd = source.indexOf('{financeSection==="overview"&&<>');
  const formStart = source.indexOf('{form&&<section');
  assert.ok(errorPosition > overviewEnd && errorPosition < formStart);
  assert.equal(source.match(/\{error&&<div/g)?.length, 1);
});
