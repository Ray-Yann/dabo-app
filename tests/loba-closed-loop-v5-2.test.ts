import test from "node:test";
import assert from "node:assert/strict";
import { prepareLobaClosedLoop } from "../lib/loba-closed-loop";

test("V5.2 prépare un besoin de courses sans écriture", () => {
  const result = prepareLobaClosedLoop("Il nous manque du lait");
  assert.ok(result);
  assert.equal(result.proposal.planKind, "shopping");
  assert.equal(result.ready, true);
  assert.deepEqual(result.missing, []);
  assert.deepEqual(
    result.plan.actions.filter(a => a.resourceType === "shopping_item").map(a => a.label),
    ["lait"]
  );
});

test("V5.2 demande une date pour un rendez-vous", () => {
  const result = prepareLobaClosedLoop("Prendre rendez-vous chez le dentiste");
  assert.ok(result);
  assert.equal(result.proposal.planKind, "appointment");
  assert.equal(result.ready, false);
  assert.deepEqual(result.missing, [{ position: 0, field: "eventDate" }]);
});

test("V5.2 ne fabrique pas de pièce à acheter pour une réparation", () => {
  const result = prepareLobaClosedLoop("La machine à laver fuit");
  assert.ok(result);
  assert.equal(result.proposal.planKind, "repair");
  assert.equal(result.ready, true);
  assert.equal(
    result.plan.actions.some(a => a.resourceType === "shopping_item"),
    false
  );
});

test("V5.2 conserve une confirmation humaine pour les réparations", () => {
  const result = prepareLobaClosedLoop("La machine à laver fuit");
  assert.ok(result);
  assert.equal(result.plan.resolutionMode, "human_required");
  assert.equal(
    result.plan.actions.some(a => a.resourceType === "human_confirmation"),
    true
  );
});

test("V5.2 ignore les demandes vides", () => {
  assert.equal(prepareLobaClosedLoop("   "), null);
});
