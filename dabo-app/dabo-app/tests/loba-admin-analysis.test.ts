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

test("LOBA V6 analyse le funnel sans inventer avant les premières données attribuées", () => {
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

test("LOBA V6 ne présente pas activité 30j comme rétention", () => {
  const text = answerLobaAdmin("Quelle est notre rétention J30 ?", kpis, [], []);
  assert.match(text, /instrumentée/i);
  assert.match(text, /indicateur d.activity|indicateur d’activité/i);
});


test("LOBA V6 lit le funnel attribué quand il existe", () => {
  const measured = { ...kpis, attributedVisits: 10, attributedSignups: 6, attributedHouseholds: 5, attributedFirstValue: 4, retentionJ1: 50, retentionJ1Eligible: 4, retentionJ7: 0, retentionJ7Eligible: 0, retentionJ30: 0, retentionJ30Eligible: 0 };
  const text = answerLobaAdmin("Analyse le funnel attribué", measured, [], []);
  assert.match(text, /10 visite/);
  assert.match(text, /6 inscription/);
  assert.match(text, /5 foyer/);
  assert.match(text, /4 première/);
  assert.match(text, /J1 50%/);
});

test("LOBA Intelligence V2 produit un résumé investisseur prudent", () => {
  const context = { growth:{ users7:{current:14,previous:7,rate:100,comparable:true}, households7:{current:10,previous:15,rate:-33,comparable:true} }, retention:{measuredSignups:1,j1:{rate:0,eligible:0,sufficient:false},j7:{rate:0,eligible:0,sufficient:false},j30:{rate:0,eligible:0,sufficient:false}}, acquisition:{measuredVisitors:2,measuredSignups:1,attributedVisits:1,attributedSignups:1} };
  const text = answerLobaAdmin("Prépare un résumé pour un investisseur", {...kpis, tasksCompleted30:57, shoppingBought30:43, eventsCreated30:12}, [], [], context);
  assert.match(text,/traction précoce/i); assert.match(text,/rétention.*cours de mesure/i); assert.match(text,/exploratoire/i); assert.match(text,/-33%/);
});

test("LOBA Intelligence V2 distingue une alerte de croissance d'une tendance durable", () => {
  const context = { growth:{ households7:{current:10,previous:15,rate:-33,comparable:true} } };
  const text = answerLobaAdmin("Qu'est-ce qui m'inquiète ?", kpis, [], [], context);
  assert.match(text,/recule de -33%/i); assert.match(text,/tendance durable/i);
});
