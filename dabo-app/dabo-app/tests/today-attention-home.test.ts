import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/app/page.tsx", import.meta.url), "utf8");
const card = readFileSync(new URL("../components/dabo/AttentionCard.tsx", import.meta.url), "utf8");

test("Aujourd’hui confie sa sélection principale à Attention Engine", () => {
  assert.match(page, /selectHouseholdAttention\(/);
  assert.match(page, /taskAttentionCandidates\(/);
  assert.match(page, /shoppingItemAttentionCandidates\(/);
  assert.match(page, /financeBillAttentionCandidates\(/);
  assert.match(page, /daboInsightAttentionCandidates\(/);
});

test("Aujourd’hui rend uniquement la sélection unifiée avec AttentionCard", () => {
  assert.match(page, /attentionItems\.map/);
  assert.match(page, /<AttentionCard/);
  assert.doesNotMatch(page, /financeBillsNeedingAttention/);
  assert.doesNotMatch(page, /essentialTasks/);
});

test("Aujourd’hui conserve un vrai état de silence", () => {
  assert.match(page, /attentionItems\.length === 0/);
  assert.match(page, /today_nothing_pressing_title/);
  assert.match(page, /<DaboEmptyState/);
});

test("les libellés de niveau AttentionCard peuvent être traduits par la surface", () => {
  assert.match(card, /levelLabel\?: string/);
  assert.match(card, /levelLabel \?\? ui\.label/);
  assert.match(page, /attention_level_action_now/);
});
