import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync("app/globals.css", "utf8");
const header = readFileSync("components/Header.tsx", "utf8");
const nav = readFileSync("components/DaboMainNav.tsx", "utf8");
const home = readFileSync("app/app/page.tsx", "utf8");
const empty = readFileSync("components/dabo/EmptyState.tsx", "utf8");

test("Brand Language V1 installe une orbite organique DABO dans les en-têtes", () => {
  assert.match(header, /dabo-brand-orbit/);
  assert.match(header, /dabo-brand-leaf-a/);
  assert.match(header, /dabo-brand-sun/);
  assert.match(css, /\.dabo-brand-orbit/);
});

test("Brand Language V1 transforme le point moutarde en repère de navigation", () => {
  assert.match(nav, /dabo-main-nav-pill-active/);
  assert.match(css, /\.dabo-main-nav-pill-active::after/);
  assert.match(css, /background: var\(--color-mustard\)/);
});

test("Brand Language V1 signe Aujourd'hui sans ajouter de nouveau contenu", () => {
  assert.match(home, /dabo-home-orbit-card/);
  assert.match(css, /\.dabo-home-orbit-card::after/);
});

test("Brand Language V1 rend même les moments calmes identifiables", () => {
  assert.match(empty, /dabo-empty-state-leaf/);
  assert.match(css, /\.dabo-empty-state-leaf/);
});
