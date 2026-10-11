import test from "node:test";
import assert from "node:assert/strict";
import { proposeClosedLoop } from "../lib/closed-loop-reasoning";

for (const [input, expected] of [
  ["Il nous manque du lait", "lait"],
  ["Il n'y a plus de lait", "lait"],
  ["Plus de pain", "pain"],
  ["Acheter des œufs", "œufs"],
  ["Nous avons besoin de riz", "riz"],
] as const) {
  test(`Closed Loop V5.2 extracts shopping item: ${input}`, () => {
    const proposal = proposeClosedLoop(input);
    assert.equal(proposal?.planKind, "shopping");
    assert.deepEqual(
      proposal?.actions.filter(action => action.resourceType === "shopping_item").map(action => action.label),
      [expected]
    );
    assert.equal(proposal?.requiresApproval, true);
  });
}

test("Closed Loop V5.2 preserves appointment classification", () => {
  const proposal = proposeClosedLoop("Prendre rendez-vous au garage");
  assert.equal(proposal?.planKind, "appointment");
  assert.equal(proposal?.resolutionMode, "human_required");
});

test("Closed Loop V5.2 preserves repair classification", () => {
  const proposal = proposeClosedLoop("La machine à laver fuit");
  assert.equal(proposal?.planKind, "repair");
  assert.equal(proposal?.actions.some(action => action.resourceType === "shopping_item"), false);
});

test("V5.2 distinguishes taking medicine from shopping", () => {
  const result = proposeClosedLoop("Prendre un m\u00e9dicament");
  assert.notEqual(result?.planKind, "shopping");
  assert.equal(result?.actions.some(action => action.resourceType === "shopping_item"), false);
});

test("V5.2 normalizes the shopping item in a multi-step request", () => {
  const result = proposeClosedLoop("Acheter du lait puis pr\u00e9parer le petit-d\u00e9jeuner");
  assert.deepEqual(
    result?.actions.filter(action => action.resourceType === "shopping_item").map(action => action.label),
    ["lait"]
  );
  assert.equal(result?.resolutionMode, "human_required");
});

test("V5.2 preserves explicit quantities without inventing products", () => {
  const result = proposeClosedLoop("Acheter 2 litres de lait");
  assert.equal(result?.planKind, "shopping");
  assert.deepEqual(
    result?.actions.filter(action => action.resourceType === "shopping_item").map(action => action.label),
    ["2 litres de lait"]
  );
});
