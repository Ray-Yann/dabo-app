import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const home = readFileSync("app/app/page.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");
test("V3.1 uses exactly six approved home shortcuts", () => {
  const ids = [...home.matchAll(/\{ id: "(tasks|planning|shopping|finance|balance|loba|scan)"/g)].map(match => match[1]);
  assert.deepEqual(ids, ["tasks", "planning", "shopping", "finance", "balance", "loba"]);
});
test("V3.1 has two manual carousels with accessible dot navigation", () => {
  assert.match(home, /title=\{carouselLabels\.daily\}/);
  assert.match(home, /title=\{carouselLabels\.household\}/);
  assert.match(home, /onScroll=\{syncActive\}/);
  assert.match(home, /aria-label=\{label\}/);
  assert.match(css, /scroll-snap-type:x mandatory/);
  assert.doesNotMatch(home, /setInterval\(/);
});
test("V3.1 carousel copy is present in all seven languages", () => {
  for (const lang of ["fr", "nl", "en", "de", "es", "it", "pt"]) assert.match(home, new RegExp(`\\b${lang}: \\{ daily:`));
});
