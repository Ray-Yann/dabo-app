import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../lib/i18n.ts", import.meta.url),
  "utf8"
);

const keys = [
  "courses_offline_bought",
  "courses_restore_to_buy",
];

for (const key of keys) {
  test(`${key} exists in all 7 language catalogues`, () => {
    const matches = source.match(new RegExp(`\\b${key}:`, "g")) || [];
    assert.equal(
      matches.length,
      7,
      `${key} should exist exactly 7 times, found ${matches.length}`
    );
  });
}
