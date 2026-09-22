import assert from "node:assert/strict";
import test from "node:test";

import {
  simulateHouseholdScenario,
  type ScenarioSnapshot,
} from "../lib/household-scenario";

function baseSnapshot(): ScenarioSnapshot {
  return {
    members: [
      { memberId: "ray", weightPoints: 60 },
      { memberId: "manga", weightPoints: 30 },
    ],
    unassignedWeightPoints: 10,
  };
}

test("reassigns load from one member to another without changing total load", () => {
  const result = simulateHouseholdScenario(baseSnapshot(), [
    {
      type: "reassign_load",
      fromMemberId: "ray",
      toMemberId: "manga",
      weightPoints: 15,
    },
  ]);

  assert.deepEqual(result.after, {
    members: [
      { memberId: "ray", weightPoints: 45 },
      { memberId: "manga", weightPoints: 45 },
    ],
    unassignedWeightPoints: 10,
  });

  assert.equal(result.interpretation, "less_concentrated");

  const beforeTotal =
    result.before.members.reduce(
      (sum, member) => sum + member.weightPoints,
      0,
    ) + result.before.unassignedWeightPoints;

  const afterTotal =
    result.after.members.reduce(
      (sum, member) => sum + member.weightPoints,
      0,
    ) + result.after.unassignedWeightPoints;

  assert.equal(beforeTotal, 100);
  assert.equal(afterTotal, 100);
});

test("can assign previously unassigned load to a member", () => {
  const result = simulateHouseholdScenario(baseSnapshot(), [
    {
      type: "reassign_load",
      fromMemberId: null,
      toMemberId: "manga",
      weightPoints: 10,
    },
  ]);

  assert.equal(result.after.unassignedWeightPoints, 0);
  assert.equal(
    result.after.members.find((member) => member.memberId === "manga")
      ?.weightPoints,
    40,
  );
});

test("can move member load back to the household as unassigned", () => {
  const result = simulateHouseholdScenario(baseSnapshot(), [
    {
      type: "reassign_load",
      fromMemberId: "ray",
      toMemberId: null,
      weightPoints: 20,
    },
  ]);

  assert.equal(
    result.after.members.find((member) => member.memberId === "ray")
      ?.weightPoints,
    40,
  );
  assert.equal(result.after.unassignedWeightPoints, 30);
});

test("does not mutate the input snapshot", () => {
  const input = baseSnapshot();
  const original = structuredClone(input);

  simulateHouseholdScenario(input, [
    {
      type: "reassign_load",
      fromMemberId: "ray",
      toMemberId: "manga",
      weightPoints: 15,
    },
  ]);

  assert.deepEqual(input, original);
});

test("capacity reduction remains descriptive and does not change load", () => {
  const input = baseSnapshot();

  const result = simulateHouseholdScenario(input, [
    {
      type: "reduce_capacity",
      memberId: "ray",
      capacityReduction: "very_reduced",
    },
  ]);

  assert.deepEqual(result.after, input);
  assert.deepEqual(result.capacityNotes, [
    {
      memberId: "ray",
      capacityReduction: "very_reduced",
    },
  ]);
  assert.equal(result.interpretation, "similar_distribution");
});

test("returns not_comparable for a solo household", () => {
  const result = simulateHouseholdScenario(
    {
      members: [{ memberId: "solo", weightPoints: 40 }],
      unassignedWeightPoints: 5,
    },
    [],
  );

  assert.equal(result.beforeConcentration, null);
  assert.equal(result.afterConcentration, null);
  assert.equal(result.interpretation, "not_comparable");
});

test("returns similar_distribution when distribution does not change", () => {
  const result = simulateHouseholdScenario(baseSnapshot(), []);

  assert.equal(result.interpretation, "similar_distribution");
});

test("rejects a reassignment from an unknown member", () => {
  assert.throws(
    () =>
      simulateHouseholdScenario(baseSnapshot(), [
        {
          type: "reassign_load",
          fromMemberId: "unknown",
          toMemberId: "manga",
          weightPoints: 5,
        },
      ]),
    /Unknown source member/,
  );
});

test("rejects a reassignment to an unknown member", () => {
  assert.throws(
    () =>
      simulateHouseholdScenario(baseSnapshot(), [
        {
          type: "reassign_load",
          fromMemberId: "ray",
          toMemberId: "unknown",
          weightPoints: 5,
        },
      ]),
    /Unknown destination member/,
  );
});

test("rejects moving more load than the source currently has", () => {
  assert.throws(
    () =>
      simulateHouseholdScenario(baseSnapshot(), [
        {
          type: "reassign_load",
          fromMemberId: "manga",
          toMemberId: "ray",
          weightPoints: 31,
        },
      ]),
    /cannot move more load than is available/,
  );
});

test("rejects duplicate member identifiers", () => {
  assert.throws(
    () =>
      simulateHouseholdScenario(
        {
          members: [
            { memberId: "same", weightPoints: 20 },
            { memberId: "same", weightPoints: 30 },
          ],
          unassignedWeightPoints: 0,
        },
        [],
      ),
    /Duplicate memberId/,
  );
});

test("reports member deltas for the projected distribution", () => {
  const result = simulateHouseholdScenario(baseSnapshot(), [
    {
      type: "reassign_load",
      fromMemberId: "ray",
      toMemberId: "manga",
      weightPoints: 15,
    },
  ]);

  assert.deepEqual(result.memberChanges, [
    {
      memberId: "ray",
      beforeWeightPoints: 60,
      afterWeightPoints: 45,
      deltaWeightPoints: -15,
    },
    {
      memberId: "manga",
      beforeWeightPoints: 30,
      afterWeightPoints: 45,
      deltaWeightPoints: 15,
    },
  ]);
});


test("rejects capacity reduction for an unknown member", () => {
  assert.throws(
    () =>
      simulateHouseholdScenario(baseSnapshot(), [
        {
          type: "reduce_capacity",
          memberId: "unknown",
          capacityReduction: "reduced",
        },
      ]),
    /Unknown member/,
  );
});

test("is deterministic for the same snapshot and operations", () => {
  const snapshot = baseSnapshot();
  const operations = [
    {
      type: "reassign_load" as const,
      fromMemberId: "ray",
      toMemberId: "manga",
      weightPoints: 12,
    },
    {
      type: "reduce_capacity" as const,
      memberId: "manga",
      capacityReduction: "very_reduced" as const,
    },
  ];

  const first = simulateHouseholdScenario(snapshot, operations);
  const second = simulateHouseholdScenario(snapshot, operations);

  assert.deepEqual(second, first);
});
