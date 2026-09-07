import assert from "node:assert/strict";
import test from "node:test";

import { computeMemberPercentages, computeNextDueDate } from "@/lib/utils";

test("les pourcentages totalisent toujours exactement 100", () => {
  const percentages = computeMemberPercentages([
    { id: "a", pts: 1 },
    { id: "b", pts: 1 },
    { id: "c", pts: 1 },
  ]);
  assert.equal([...percentages.values()].reduce((sum, value) => sum + value, 0), 100);
  assert.deepEqual([...percentages.values()], [34, 33, 33]);
});

test("une récurrence quotidienne saute les occurrences manquées", () => {
  assert.equal(computeNextDueDate("2026-09-01", "2026-09-07", "daily"), "2026-09-08");
});

test("une récurrence bimensuelle conserve son rythme", () => {
  assert.equal(computeNextDueDate("2026-09-01", "2026-09-07", "biweekly"), "2026-09-15");
});

test("une récurrence mensuelle ancrée au 31 utilise le dernier jour disponible", () => {
  assert.equal(computeNextDueDate("2026-01-31", "2026-01-31", "monthly", [], "2026-01-31"), "2026-02-28");
  assert.equal(computeNextDueDate("2026-02-28", "2026-02-28", "monthly", [], "2026-01-31"), "2026-03-31");
});

test("une récurrence annuelle du 29 février reste stable", () => {
  assert.equal(computeNextDueDate("2024-02-29", "2024-02-29", "yearly", [], "2024-02-29"), "2025-02-28");
});

test("une récurrence personnalisée choisit le prochain jour autorisé", () => {
  assert.equal(computeNextDueDate("2026-09-07", "2026-09-07", "custom", [1, 4]), "2026-09-10");
});

test("une récurrence personnalisée vide est refusée explicitement", () => {
  assert.throws(
    () => computeNextDueDate("2026-09-07", "2026-09-07", "custom", []),
    /requires at least one weekday/
  );
});
