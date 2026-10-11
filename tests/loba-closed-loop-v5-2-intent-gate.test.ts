import test from "node:test";
import assert from "node:assert/strict";
import { isExplicitClosedLoopNeed, prepareLobaClosedLoop } from "../lib/loba-closed-loop";

const ordinaryQuestions = [
  "Combien avons-nous dépensé ce mois-ci ?",
  "Comment fonctionne le bilan du foyer ?",
  "Pourquoi notre budget a-t-il augmenté ?",
  "Qui doit faire les courses ?",
  "Quand est notre prochain rendez-vous ?",
];

for (const question of ordinaryQuestions) {
  test(`V5.2 ignore la question : ${question}`, () => {
    assert.equal(isExplicitClosedLoopNeed(question), false);
    assert.equal(prepareLobaClosedLoop(question), null);
  });
}

const unsupportedLanguages = [
  "We need milk",
  "We hebben melk nodig",
  "Necesitamos leche",
];

for (const question of unsupportedLanguages) {
  test(`V5.2 conserve le parcours LOBA existant : ${question}`, () => {
    assert.equal(prepareLobaClosedLoop(question), null);
  });
}

const explicitNeeds = [
  "Il nous manque du lait",
  "Acheter des œufs",
  "Prendre rendez-vous chez le dentiste",
  "La machine à laver fuit",
];

for (const question of explicitNeeds) {
  test(`V5.2 prépare le besoin explicite : ${question}`, () => {
    assert.equal(isExplicitClosedLoopNeed(question), true);
    assert.ok(prepareLobaClosedLoop(question));
  });
}
