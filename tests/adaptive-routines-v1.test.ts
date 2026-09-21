import assert from "node:assert/strict";
import test from "node:test";

import { detectAdaptiveRoutineSuggestion, realignPendingRoutineDueDate } from "../lib/adaptive-routines";

test("suggests a new weekday after 3 coherent completions", () => {
  const result = detectAdaptiveRoutineSuggestion({
    timeZone: "Europe/Brussels",
    frequency: "weekly",
    anchorDate: "2026-09-05",
    occurrences: [
      { dueDate: "2026-09-05", completedAt: "2026-09-06T10:00:00" },
      { dueDate: "2026-09-12", completedAt: "2026-09-13T10:00:00" },
      { dueDate: "2026-09-19", completedAt: "2026-09-20T10:00:00" },
    ],
  });

  assert.ok(result);
  assert.equal(result.observedWeekday, 0);
  assert.equal(result.anchorWeekday, 0);
  assert.equal(result.coherentOccurrences, 3);
  assert.equal(result.observedOccurrences, 3);
  assert.equal(result.confidence, 1);
  assert.equal(result.reason, "stable_weekday_drift");
});

test("accepts 3 coherent completions among the latest 4", () => {
  const result = detectAdaptiveRoutineSuggestion({
    timeZone: "Europe/Brussels",
    frequency: "weekly",
    anchorDate: "2026-08-29",
    occurrences: [
      { dueDate: "2026-08-29", completedAt: "2026-08-30T10:00:00" },
      { dueDate: "2026-09-05", completedAt: "2026-09-06T10:00:00" },
      { dueDate: "2026-09-12", completedAt: "2026-09-14T10:00:00" },
      { dueDate: "2026-09-19", completedAt: "2026-09-20T10:00:00" },
    ],
  });

  assert.ok(result);
  assert.equal(result.observedWeekday, 0);
  assert.equal(result.coherentOccurrences, 3);
  assert.equal(result.observedOccurrences, 4);
  assert.equal(result.confidence, 0.75);
});

test("does not suggest when recent behavior is unstable", () => {
  const result = detectAdaptiveRoutineSuggestion({
    timeZone: "Europe/Brussels",
    frequency: "weekly",
    anchorDate: "2026-08-29",
    occurrences: [
      { dueDate: "2026-08-29", completedAt: "2026-08-30T10:00:00" },
      { dueDate: "2026-09-05", completedAt: "2026-09-07T10:00:00" },
      { dueDate: "2026-09-12", completedAt: "2026-09-15T10:00:00" },
      { dueDate: "2026-09-19", completedAt: "2026-09-23T10:00:00" },
    ],
  });

  assert.equal(result, null);
});

test("does not suggest with fewer than 3 completed occurrences", () => {
  const result = detectAdaptiveRoutineSuggestion({
    timeZone: "Europe/Brussels",
    frequency: "weekly",
    anchorDate: "2026-09-05",
    occurrences: [
      { dueDate: "2026-09-05", completedAt: "2026-09-06T10:00:00" },
      { dueDate: "2026-09-12", completedAt: "2026-09-13T10:00:00" },
    ],
  });

  assert.equal(result, null);
});

test("does not suggest when the observed weekday already matches the declared weekly routine", () => {
  const result = detectAdaptiveRoutineSuggestion({
    timeZone: "Europe/Brussels",
    frequency: "weekly",
    anchorDate: "2026-09-06",
    occurrences: [
      { dueDate: "2026-09-06", completedAt: "2026-09-06T10:00:00" },
      { dueDate: "2026-09-13", completedAt: "2026-09-13T10:00:00" },
      { dueDate: "2026-09-20", completedAt: "2026-09-20T10:00:00" },
    ],
  });

  assert.equal(result, null);
});

test("suggests replacement weekday for a custom routine", () => {
  const result = detectAdaptiveRoutineSuggestion({
    timeZone: "Europe/Brussels",
    frequency: "custom",
    customDays: [6],
    anchorDate: "2026-09-05",
    occurrences: [
      { dueDate: "2026-09-05", completedAt: "2026-09-06T10:00:00" },
      { dueDate: "2026-09-12", completedAt: "2026-09-13T10:00:00" },
      { dueDate: "2026-09-19", completedAt: "2026-09-20T10:00:00" },
    ],
  });

  assert.ok(result);
  assert.deepEqual(result.customDays, [0]);
  assert.equal(result.observedWeekday, 0);
});

test("does not suggest for daily routines in V1", () => {
  const result = detectAdaptiveRoutineSuggestion({
    timeZone: "Europe/Brussels",
    frequency: "daily",
    anchorDate: "2026-09-18",
    occurrences: [
      { dueDate: "2026-09-18", completedAt: "2026-09-20T10:00:00" },
      { dueDate: "2026-09-19", completedAt: "2026-09-20T11:00:00" },
      { dueDate: "2026-09-20", completedAt: "2026-09-20T12:00:00" },
    ],
  });

  assert.equal(result, null);
});

test("does not suggest for monthly routines in V1", () => {
  const result = detectAdaptiveRoutineSuggestion({
    timeZone: "Europe/Brussels",
    frequency: "monthly",
    anchorDate: "2026-06-15",
    occurrences: [
      { dueDate: "2026-06-15", completedAt: "2026-06-21T10:00:00" },
      { dueDate: "2026-07-15", completedAt: "2026-07-19T10:00:00" },
      { dueDate: "2026-08-15", completedAt: "2026-08-16T10:00:00" },
      { dueDate: "2026-09-15", completedAt: "2026-09-20T10:00:00" },
    ],
  });

  assert.equal(result, null);
});

test("only considers the 4 most recent completed occurrences", () => {
  const result = detectAdaptiveRoutineSuggestion({
    timeZone: "Europe/Brussels",
    frequency: "weekly",
    anchorDate: "2026-08-15",
    occurrences: [
      { dueDate: "2026-08-15", completedAt: "2026-08-17T10:00:00" },
      { dueDate: "2026-08-22", completedAt: "2026-08-24T10:00:00" },
      { dueDate: "2026-08-29", completedAt: "2026-08-30T10:00:00" },
      { dueDate: "2026-09-05", completedAt: "2026-09-06T10:00:00" },
      { dueDate: "2026-09-12", completedAt: "2026-09-13T10:00:00" },
      { dueDate: "2026-09-19", completedAt: "2026-09-20T10:00:00" },
    ],
  });

  assert.ok(result);
  assert.equal(result.observedWeekday, 0);
  assert.equal(result.coherentOccurrences, 4);
  assert.equal(result.observedOccurrences, 4);
  assert.equal(result.confidence, 1);
});


test("uses the explicit timezone when a completion crosses the local midnight boundary", () => {
  const result = detectAdaptiveRoutineSuggestion({
    timeZone: "Europe/Brussels",
    frequency: "weekly",
    anchorDate: "2026-09-05",
    occurrences: [
      { dueDate: "2026-09-05", completedAt: "2026-09-05T22:30:00Z" },
      { dueDate: "2026-09-12", completedAt: "2026-09-12T22:30:00Z" },
      { dueDate: "2026-09-19", completedAt: "2026-09-19T22:30:00Z" },
    ],
  });

  assert.ok(result);
  assert.equal(result.observedWeekday, 0);
  assert.equal(result.anchorWeekday, 0);
  assert.equal(result.confidence, 1);
});


test("does not adapt a multi-day custom routine in V1", () => {
  const result = detectAdaptiveRoutineSuggestion({
    timeZone: "Europe/Brussels",
    frequency: "custom",
    customDays: [1, 3, 5],
    anchorDate: "2026-09-07",
    occurrences: [
      { dueDate: "2026-09-07", completedAt: "2026-09-08T10:00:00Z" },
      { dueDate: "2026-09-14", completedAt: "2026-09-15T10:00:00Z" },
      { dueDate: "2026-09-21", completedAt: "2026-09-22T10:00:00Z" },
    ],
  });

  assert.equal(result, null);
});


test("realigns Saturday to the following Sunday", () => {
  assert.equal(
    realignPendingRoutineDueDate("2026-09-19", 0),
    "2026-09-20"
  );
});

test("realigns Sunday to the following Saturday without moving backward", () => {
  assert.equal(
    realignPendingRoutineDueDate("2026-09-20", 6),
    "2026-09-26"
  );
});

test("keeps the due date when it already matches the target weekday", () => {
  assert.equal(
    realignPendingRoutineDueDate("2026-09-22", 2),
    "2026-09-22"
  );
});

test("realigns correctly across a month boundary", () => {
  assert.equal(
    realignPendingRoutineDueDate("2026-09-30", 5),
    "2026-10-02"
  );
});
