import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name: string) => readFileSync(new URL(`../components/dabo/${name}`, import.meta.url), "utf8");

test("Design System expose les cinq primitives DABO", () => {
  const barrel = read("index.ts");
  for (const name of ["AttentionCard", "QuickStatCard", "LobaInsightCard", "EmptyState", "SectionHeader"]) assert.match(barrel, new RegExp(name));
});

test("AttentionCard couvre les quatre niveaux sans score visible", () => {
  const source = read("AttentionCard.tsx");
  for (const level of ["action_now", "anticipate", "suggestion", "information"]) assert.match(source, new RegExp(level));
  assert.doesNotMatch(source, /priority\s*[:=]/);
});

test("les primitives utilisent les rôles de thème DABO et restent compatibles clair/sombre", () => {
  const source = ["AttentionCard.tsx", "QuickStatCard.tsx", "LobaInsightCard.tsx", "EmptyState.tsx", "SectionHeader.tsx"].map(read).join("\n");
  assert.match(source, /text-ink/);
  assert.match(source, /text-muted/);
  assert.match(source, /bg-white2|bg-paper|bg-mustardBg/);
  assert.doesNotMatch(source, /#[0-9a-fA-F]{3,8}/);
});

test("les cartes interactives restent de vrais boutons accessibles", () => {
  assert.match(read("AttentionCard.tsx"), /<button type="button"/);
  assert.match(read("LobaInsightCard.tsx"), /<button type="button"/);
  assert.match(read("EmptyState.tsx"), /<button type="button"/);
});

test("le design system n'introduit aucune dépendance externe ni logique métier", () => {
  const source = ["AttentionCard.tsx", "QuickStatCard.tsx", "LobaInsightCard.tsx", "EmptyState.tsx", "SectionHeader.tsx"].map(read).join("\n");
  assert.doesNotMatch(source, /supabase|fetch\(|GROQ|finance_transactions|shopping_sessions/i);
});
