import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const home = readFileSync("app/app/page.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");
test("V3.1.2 sizes carousel viewport to the active card, including later content changes", () => {
  assert.match(home, /const \[trackHeight, setTrackHeight\] = useState/);
  assert.match(home, /new ResizeObserver\(update\)/);
  assert.match(home, /observer\.observe\(slide\)/);
  assert.match(home, /style=\{trackHeight \? \{ height: trackHeight \+ 12 \}/);
  assert.match(css, /\.dabo-today-v2 \.dabo-v31-carousel-track\{align-items:flex-start;overflow-y:hidden/);
});
test("V3.1.2 preserves manual swipe, preview and accessible navigation", () => {
  assert.match(css, /scroll-snap-type:x mandatory/);
  assert.match(home, /onScroll=\{syncActive\}/);
  assert.match(home, /aria-label=\{label\}/);
  assert.doesNotMatch(home, /setInterval\(/);
});
test("V3.1.2 uses Planning for the shortcut in seven languages without changing the destination", () => {
  assert.match(home, /id: "planning", label: \(\{fr:"Planning",nl:"Planning",en:"Planning",de:"Planung",es:"Planificación",it:"Pianificazione",pt:"Planeamento"\}/);
  assert.match(home, /href: "\/app\/calendrier"/);
});
