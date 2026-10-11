import test from "node:test";
import assert from "node:assert/strict";
import { prepareLobaClosedLoop } from "../lib/loba-closed-loop";

const shouldIgnore = [
  "Acheter ou louer : que conseilles-tu ?",
  "Acheter quoi pour le dîner ?",
  "Prendre un médicament",
  "Prendre rendez-vous : comment faire ?",
  "Organiser quoi ce week-end ?",
  "Préparer comment notre budget ?",
  "Il nous manque quoi exactement ?",
  "Plus de détails sur nos dépenses",
  "La machine à laver fuit-elle vraiment ?",
];

for (const question of shouldIgnore) {
  test(`V5.2 ne transforme pas une demande ambiguë en plan : ${question}`, () => {
    assert.equal(prepareLobaClosedLoop(question), null);
  });
}

const shouldPrepare = [
  "Il nous manque du lait",
  "Acheter des œufs",
  "Prendre rendez-vous chez le dentiste",
  "La machine à laver fuit",
];

for (const question of shouldPrepare) {
  test(`V5.2 conserve le besoin explicite : ${question}`, () => {
    assert.ok(prepareLobaClosedLoop(question));
  });
}
