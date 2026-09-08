import test from "node:test";
import assert from "node:assert/strict";
import { answerLobaAdmin, buildLobaAnalysis } from "@/lib/loba-admin-analysis";

const kpis = {
  users: 19,
  accountsWithoutHousehold: 2,
  accountToHouseholdRate: 89,
  households: 23,
  activeHouseholds30: 15,
  shares30: 0,
  shareUsers30: 0,
};

test("LOBA V5 calcule les ratios sans mélanger comptes et foyers", () => {
  const a = buildLobaAnalysis(kpis);
  assert.equal(a.ratios[0].rate, 89);
  assert.equal(a.ratios[1].rate, 65);
  assert.match(a.gaps.join(" "), /utilisateurs.*foyers/i);
});

test("LOBA V5 analyse le funnel et signale les données manquantes", () => {
  const text = answerLobaAdmin("Analyse le funnel et dis-moi où nous perdons le plus d'utilisateurs", kpis, [], []);
  assert.match(text, /65%/);
  assert.match(text, /ne considère pas/i);
  assert.match(text, /partage.*visite.*inscription/i);
  assert.match(text, /J1\/J7\/J30/i);
});

test("LOBA V5 répond précisément sur activation et comptes sans foyer", () => {
  const text = answerLobaAdmin("Combien d'utilisateurs avons-nous, combien n'ont pas encore de foyer, et quel est notre taux d'activation ?", kpis, [], []);
  assert.match(text, /19 utilisateurs/i);
  assert.match(text, /2 comptes/i);
  assert.match(text, /17\/19/);
  assert.match(text, /89%/);
});

test("LOBA V5 ne présente pas activité 30j comme rétention", () => {
  const text = answerLobaAdmin("Quelle est notre rétention J30 ?", kpis, [], []);
  assert.match(text, /pas encore une vraie rétention/i);
  assert.match(text, /cohortes/i);
});
