import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const attention = fs.readFileSync("components/dabo/AttentionCard.tsx", "utf8");
const css = fs.readFileSync("app/globals.css", "utf8");

test("Dark Mode Readability V1 retire les pseudo-variantes dabo-dark de AttentionCard", () => {
  assert.equal(attention.includes("dabo-dark:"), false);
  assert.match(attention, /dabo-attention-card/);
});

test("Dark Mode Readability V1 pilote ensemble surface bordure et accent de chaque niveau", () => {
  for (const tone of ["action-now", "anticipate", "suggestion", "information"]) {
    assert.match(css, new RegExp(`dabo-attention-${tone}`));
  }
  assert.match(css, /--dabo-attention-surface/);
  assert.match(css, /--dabo-attention-border/);
  assert.match(css, /--dabo-attention-accent/);
});

test("Dark Mode Readability V1 fournit de vraies variantes sombres pour les attentions colorées", () => {
  for (const tone of ["action-now", "anticipate", "suggestion", "information"]) {
    assert.match(css, new RegExp(`\\.dabo-dark \\.dabo-attention-${tone}`));
  }
});

test("Dark Mode Readability V1 conserve les textes de contenu sur les rôles DABO adaptatifs", () => {
  assert.match(attention, /text-ink/);
  assert.match(attention, /text-muted/);
  assert.match(css, /\.dabo-dark[\s\S]*--color-ink: #EDEAE0/);
  assert.match(css, /\.dabo-dark[\s\S]*--color-muted: #A79F8C/);
});
