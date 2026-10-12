import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const css = readFileSync("app/globals.css", "utf8");
const home = readFileSync("app/app/page.tsx", "utf8");
test("V3.1.1 keeps all six home shortcuts visible on mobile", () => {
  assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /\.dabo-today-v2 \.dabo-v32-shortcuts\{display:grid/);
  assert.match(css, /overflow:visible;mask-image:none/);
});
test("V3.1.1 uses compact, content-sized carousel panels", () => {
  assert.match(css, /\.dabo-v31-carousel-slide>\.dabo-v3-panel\{min-height:156px;height:auto/);
  assert.match(css, /\.dabo-v31-carousel-slide \.dabo-v3-line\{min-height:54px/);
});
test("V3.1.1 removes redundant visible slide heading without losing screen-reader announcements", () => {
  assert.match(home, /className="sr-only" aria-live="polite"/);
  assert.match(home, /className="dabo-v31-carousel-dots"/);
});
