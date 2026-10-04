import assert from "node:assert/strict";
import test from "node:test";

import {
  occurrenceOnOrAfter,
  occurrencesInRange,
} from "../lib/calendar-recurrence";

const singleEvent = {
  event_date: "2026-10-04",
  recurring: false,
  recurrence_frequency: "none" as const,
  recurrence_interval: 1,
  recurrence_end_date: null,
};

test("un événement non récurrent n'apparaît qu'une fois dans une plage", () => {
  const occurrences = occurrencesInRange(
    singleEvent,
    new Date("2026-10-01T00:00:00"),
    new Date("2026-10-31T00:00:00")
  );

  assert.equal(occurrences.length, 1);
  assert.equal(
    occurrences[0].getFullYear(),
    2026
  );
  assert.equal(occurrences[0].getMonth(), 9);
  assert.equal(occurrences[0].getDate(), 4);
});

test("un événement non récurrent passé n'est pas retourné à nouveau", () => {
  const occurrence = occurrenceOnOrAfter(
    singleEvent,
    new Date("2026-10-05T00:00:00")
  );

  assert.equal(occurrence, null);
});
