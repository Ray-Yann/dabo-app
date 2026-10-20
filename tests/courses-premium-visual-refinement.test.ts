import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Courses Premium uses named store identifiers without pretending they are official logos", () => {
  const page = readFileSync("app/app/courses/page.tsx", "utf8");
  const css = readFileSync("app/globals.css", "utf8");
  assert.match(page, /dabo-courses-store-wordmark/);
  assert.match(css, /dabo-courses-store-wordmark/);
  assert.match(css, /columns: 2/);
  assert.match(css, /break-inside: avoid/);
  assert.match(css, /category-card\[aria-pressed="true"\]/);
});
