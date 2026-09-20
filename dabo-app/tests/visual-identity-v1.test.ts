import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync("app/globals.css", "utf8");
const layout = readFileSync("app/app/layout.tsx", "utf8");
const nav = readFileSync("components/DaboMainNav.tsx", "utf8");
const empty = readFileSync("components/dabo/EmptyState.tsx", "utf8");
const tasks = readFileSync("app/app/taches/page.tsx", "utf8");

test("Visual Identity V1 enrichit la marque sans changer la palette de rôles DABO", () => {
  assert.match(css, /DABO Visual Identity V1/);
  assert.match(css, /radial-gradient/);
  assert.match(css, /var\(--color-paper\)/);
  assert.match(css, /prefers-reduced-motion/);
});

test("Visual Identity V1 donne une vraie présence desktop sans étirer DABO", () => {
  assert.match(layout, /max-w-lg md:max-w-3xl/);
  assert.match(nav, /max-w-lg md:max-w-3xl/);
});

test("Visual Identity V1 rend les états vides plus organiques", () => {
  assert.match(empty, /Sprout/);
  assert.match(empty, /dabo-empty-state/);
});

test("Visual Identity V1 fait entrer la couleur membre dans les groupes de tâches", () => {
  assert.match(tasks, /import \{ Avatar \}/);
  assert.match(tasks, /group\.key !== "unassigned"/);
  assert.match(tasks, /<Avatar/);
});
