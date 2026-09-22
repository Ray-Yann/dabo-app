import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildHouseholdMemory,
  presentHouseholdMemory,
  type AcceptedRebalanceMemorySource,
  type RoutineAdaptationMemorySource,
} from "../lib/household-memory";

const routine = (
  overrides: Partial<RoutineAdaptationMemorySource> = {},
): RoutineAdaptationMemorySource => ({
  id: "rp-1",
  household_id: "h1",
  routine_id: "r1",
  suggested_frequency: "weekly",
  suggested_custom_days: null,
  suggested_anchor_weekday: 2,
  status: "accepted",
  suggested_at: "2026-09-20T08:00:00Z",
  responded_at: "2026-09-21T09:00:00Z",
  ...overrides,
});

const rebalance = (
  overrides: Partial<AcceptedRebalanceMemorySource> = {},
): AcceptedRebalanceMemorySource => ({
  id: "ha-1",
  household_id: "h1",
  task_id: "t1",
  suggested_member_id: "m2",
  previous_assigned_to: "m1",
  reason: "rebalance",
  accepted_at: "2026-09-22T10:00:00Z",
  ...overrides,
});

test("keeps an accepted routine adaptation as household memory", () => {
  const result = buildHouseholdMemory({
    householdId: "h1",
    routineAdaptations: [routine()],
    acceptedRebalances: [],
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].type, "accepted_routine_adaptation");
  assert.equal(result[0].sourceId, "rp-1");
});

test("does not remember pending, dismissed or snoozed routine suggestions", () => {
  const result = buildHouseholdMemory({
    householdId: "h1",
    routineAdaptations: [
      routine({ id: "pending", status: "pending" }),
      routine({ id: "dismissed", status: "dismissed" }),
      routine({ id: "snoozed", status: "snoozed" }),
    ],
    acceptedRebalances: [],
  });

  assert.deepEqual(result, []);
});

test("keeps an accepted rebalance as household memory", () => {
  const result = buildHouseholdMemory({
    householdId: "h1",
    routineAdaptations: [],
    acceptedRebalances: [rebalance()],
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].type, "accepted_rebalance");
  assert.equal(result[0].sourceId, "ha-1");
});

test("never mixes memories from another household", () => {
  const result = buildHouseholdMemory({
    householdId: "h1",
    routineAdaptations: [routine({ household_id: "h2" })],
    acceptedRebalances: [rebalance({ household_id: "h2" })],
  });

  assert.deepEqual(result, []);
});

test("uses the explicit routine response date when available", () => {
  const result = buildHouseholdMemory({
    householdId: "h1",
    routineAdaptations: [routine()],
    acceptedRebalances: [],
  });

  assert.equal(result[0].occurredAt, "2026-09-21T09:00:00Z");
});

test("falls back to suggestion date for legacy accepted routine rows", () => {
  const result = buildHouseholdMemory({
    householdId: "h1",
    routineAdaptations: [routine({ responded_at: null })],
    acceptedRebalances: [],
  });

  assert.equal(result[0].occurredAt, "2026-09-20T08:00:00Z");
});

test("sorts memories newest first deterministically", () => {
  const result = buildHouseholdMemory({
    householdId: "h1",
    routineAdaptations: [routine()],
    acceptedRebalances: [rebalance()],
  });

  assert.deepEqual(
    result.map((memory) => memory.type),
    ["accepted_rebalance", "accepted_routine_adaptation"],
  );
});

test("does not mutate source rows", () => {
  const source = routine({ suggested_custom_days: [2] });
  const before = JSON.stringify(source);

  const result = buildHouseholdMemory({
    householdId: "h1",
    routineAdaptations: [source],
    acceptedRebalances: [],
  });

  assert.equal(JSON.stringify(source), before);

  if (result[0]?.type === "accepted_routine_adaptation") {
    result[0].suggestedCustomDays?.push(4);
  }

  assert.deepEqual(source.suggested_custom_days, [2]);
});


test("Household Memory V1 has a deliberately narrow source boundary", () => {
  const moduleSource = fs.readFileSync(
    new URL("../lib/household-memory.ts", import.meta.url),
    "utf8",
  );

  assert.match(moduleSource, /routine_adaptation_preference/);
  assert.match(moduleSource, /household_action_suggestion/);

  assert.doesNotMatch(moduleSource, /member_load_perceptions/);
  assert.doesNotMatch(moduleSource, /perception-gap/);
  assert.doesNotMatch(moduleSource, /member_life_contexts/);
  assert.doesNotMatch(moduleSource, /life-context/);
  assert.doesNotMatch(moduleSource, /household-insights/);
  assert.doesNotMatch(moduleSource, /household-evolution/);
  assert.doesNotMatch(moduleSource, /loba/i);
});


test("presents a routine memory with its current human-readable name", () => {
  const [memory] = buildHouseholdMemory({
    householdId: "h1",
    routineAdaptations: [routine()],
    acceptedRebalances: [],
  });

  const presentation = presentHouseholdMemory(memory, {
    routines: [{ id: "r1", name: "Sortir les poubelles" }],
    tasks: [],
    members: [],
  });

  assert.equal(presentation.subjectName, "Sortir les poubelles");
  assert.equal(presentation.memberName, null);
  assert.equal(presentation.previousMemberName, null);
});

test("presents a rebalance with task and member names", () => {
  const [memory] = buildHouseholdMemory({
    householdId: "h1",
    routineAdaptations: [],
    acceptedRebalances: [rebalance()],
  });

  const presentation = presentHouseholdMemory(memory, {
    routines: [],
    tasks: [{ id: "t1", name: "Faire les courses" }],
    members: [
      { id: "m1", first_name: "Alex" },
      { id: "m2", first_name: "Sam" },
    ],
  });

  assert.equal(presentation.subjectName, "Faire les courses");
  assert.equal(presentation.memberName, "Sam");
  assert.equal(presentation.previousMemberName, "Alex");
});

test("uses null instead of inventing labels for missing historical objects", () => {
  const [routineMemory] = buildHouseholdMemory({
    householdId: "h1",
    routineAdaptations: [routine()],
    acceptedRebalances: [],
  });

  const [rebalanceMemory] = buildHouseholdMemory({
    householdId: "h1",
    routineAdaptations: [],
    acceptedRebalances: [rebalance()],
  });

  const emptyContext = {
    routines: [],
    tasks: [],
    members: [],
  };

  const routinePresentation = presentHouseholdMemory(
    routineMemory,
    emptyContext,
  );
  const rebalancePresentation = presentHouseholdMemory(
    rebalanceMemory,
    emptyContext,
  );

  assert.equal(routinePresentation.subjectName, null);
  assert.equal(rebalancePresentation.subjectName, null);
  assert.equal(rebalancePresentation.memberName, null);
  assert.equal(rebalancePresentation.previousMemberName, null);
});

test("preserves the factual memory date and type in presentation", () => {
  const [memory] = buildHouseholdMemory({
    householdId: "h1",
    routineAdaptations: [],
    acceptedRebalances: [rebalance()],
  });

  const presentation = presentHouseholdMemory(memory, {
    routines: [],
    tasks: [],
    members: [],
  });

  assert.equal(presentation.memoryId, memory.id);
  assert.equal(presentation.type, "accepted_rebalance");
  assert.equal(presentation.occurredAt, "2026-09-22T10:00:00Z");
});
