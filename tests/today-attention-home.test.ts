import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/app/page.tsx", import.meta.url), "utf8");
const card = readFileSync(new URL("../components/dabo/AttentionCard.tsx", import.meta.url), "utf8");
const coursesPage = readFileSync(new URL("../app/app/courses/page.tsx", import.meta.url), "utf8");

test("Aujourd’hui confie sa sélection principale à Attention Engine", () => {
  assert.match(page, /selectHouseholdAttention\(/);
  assert.match(page, /taskAttentionCandidates\(/);
  assert.match(page, /shoppingItemAttentionCandidates\(/);
  assert.match(page, /financeBillAttentionCandidates\(/);
  assert.match(page, /daboInsightAttentionCandidates\(/);
});

test("Aujourd’hui V2 rend la sélection unifiée dans la surface éditoriale", () => {
  assert.match(page, /attentionItems\.slice\(0, 4\)/);
  assert.match(page, /dabo-v3-line/);
  assert.doesNotMatch(page, /financeBillsNeedingAttention/);
  assert.doesNotMatch(page, /essentialTasks/);
});

test("Aujourd’hui V2 conserve un vrai état de silence", () => {
  assert.match(page, /visibleAttention\.length === 0/);
  assert.match(page, /today_v2_calm_title/);
  assert.match(page, /dabo-v3-empty/);
});

test("les libellés de niveau AttentionCard peuvent être traduits par la surface", () => {
  assert.match(card, /levelLabel\?: string/);
  assert.match(card, /levelLabel \?\? ui\.label/);
  assert.match(page, /attention_level_action_now/);
});


test("Aujourd'hui fait remonter les habitudes Courses predictives dans Attention Engine", () => {
  assert.match(page, /generateShoppingSuggestions/);
  assert.match(page, /shoppingHabitAttentionCandidates/);
  assert.match(
    page,
    /from\("shopping_items"\)\.select\("\*"\)\.eq\("household_id", household\.id\)/
  );
  assert.match(
    page,
    /from\("shopping_suggestion_preferences"\)\.select\("\*"\)\.eq\("household_id", household\.id\)/
  );
  assert.match(page, /generateShoppingSuggestions\(\{[\s\S]*?items:[\s\S]*?preferences:[\s\S]*?today(?:\s*:|\s*[,}])/);
});


test("une suggestion Courses predictive utilise un message distinct d'un rappel", () => {
  assert.match(page, /attention\.action === "open_shopping_suggestions"/);
  assert.match(page, /today_attention_shopping_predictive/);
});

test("une anticipation Courses ouvre directement la vue Suggestions", () => {
  assert.match(page, /attention\.action === "open_shopping_suggestions"/);
  assert.match(page, /router\.push\("\/app\/courses\?view=suggestions"\)/);
  assert.match(coursesPage, /searchParams\.get\("view"\)/);
  assert.match(coursesPage, /setView\("suggestions"\)/);
});
