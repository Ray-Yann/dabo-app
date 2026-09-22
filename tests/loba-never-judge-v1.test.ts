import test from "node:test";
import assert from "node:assert/strict";

import {
  buildHouseholdPrompt,
  LOBA_NEVER_JUDGE_CONTRACT,
  type LobaHouseholdContext,
} from "@/lib/loba-household-ai";

const context: LobaHouseholdContext = {
  household: { id: "h1", name: "Maison" },
  currentMember: { id: "m1", firstName: "Ray", language: "fr" },
  members: [
    { id: "m1", firstName: "Ray" },
    { id: "m2", firstName: "Manga" },
  ],
  tasks: [],
  shopping: [],
  events: [],
  balance: [
    { memberId: "m1", firstName: "Ray", points30d: 80 },
    { memberId: "m2", firstName: "Manga", points30d: 20 },
  ],
  generatedAt: "2026-09-22T07:00:00.000Z",
};

test("Never Judge est un contrat explicite du prompt LOBA", () => {
  const prompt = buildHouseholdPrompt(context);

  assert.ok(prompt.includes(LOBA_NEVER_JUDGE_CONTRACT.trim()));
  assert.match(prompt, /NEVER JUDGE/i);
});

test("les points sont définis comme contributions enregistrées et non comme mérite", () => {
  const prompt = buildHouseholdPrompt(context);

  assert.match(prompt, /contributions enregistrées/i);
  assert.match(prompt, /ne mesurent jamais la valeur/i);
  assert.match(prompt, /effort global/i);
  assert.match(prompt, /travail accompli hors de DABO/i);
});

test("l'absence de données ne devient jamais une absence de contribution réelle", () => {
  const prompt = buildHouseholdPrompt(context);

  assert.match(prompt, /faible quantité de données enregistrées/i);
  assert.match(prompt, /ne signifie jamais/i);
  assert.match(prompt, /vie réelle/i);
});

test("LOBA interdit classements, étiquettes et intentions supposées", () => {
  const prompt = buildHouseholdPrompt(context);

  assert.match(prompt, /Ne classe jamais les membres/i);
  assert.match(prompt, /paresseux/i);
  assert.match(prompt, /désorganisé/i);
  assert.match(prompt, /N'attribue jamais d'intention/i);
  assert.match(prompt, /responsabilité morale/i);
});

test("un écart chiffré ne devient ni accusation ni obligation", () => {
  const prompt = buildHouseholdPrompt(context);

  assert.match(prompt, /Ne transforme jamais un écart chiffré en accusation/i);
  assert.match(prompt, /devrait en faire plus/i);
  assert.match(prompt, /sans culpabiliser/i);
  assert.match(prompt, /sans.*verdict/i);
});

test("Never Judge couvre aussi les finances et les demandes de comparaison", () => {
  const prompt = buildHouseholdPrompt(context);

  assert.match(prompt, /finances pour juger/i);
  assert.match(prompt, /générosité/i);
  assert.match(prompt, /juger ou comparer des personnes/i);
  assert.match(prompt, /faits observables/i);
  assert.match(prompt, /possibilité d'organisation neutre/i);
});

test("le contrat ne retire pas les protections historiques de LOBA", () => {
  const prompt = buildHouseholdPrompt(context);

  assert.match(prompt, /confirmation explicite/i);
  assert.match(prompt, /n'invente jamais/i);
  assert.match(prompt, /CONTEXTE DU FOYER ACTIF/i);
});
