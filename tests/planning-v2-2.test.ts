import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const page = fs.readFileSync("app/app/calendrier/page.tsx", "utf8");
const css = fs.readFileSync("app/globals.css", "utf8");

test("Planning V2.2 compte seulement ce qui reste réellement à organiser", () => {
  assert.ok(page.includes("dayOrganizeCount"));
  assert.ok(page.includes("dayUnscheduledTasks.length + dayBills.length + dayUnassignedResponsibilities.length"));
  assert.ok(!page.includes("dayEvents.length + daySlots.length + dayUnscheduledTasks.length + dayBills.length"));
});

test("Planning V2.2 conserve les horaires dans la semaine et le mois", () => {
  assert.ok(page.includes("weekDayData"));
  assert.ok(page.includes("slot.start_time.slice(0,5)"));
  assert.ok(page.includes('slot.occurrence_date===task.due_date'));
});

test("Planning V2.2 rend les préparations réversibles et optionnellement datées", () => {
  assert.ok(page.includes("restoreResponsibility"));
  assert.ok(page.includes("planning_completed_preparations"));
  assert.ok(page.includes("responsibilityDraftDate"));
  assert.ok(page.includes("responsibilityDraftTime"));
});

test("Planning V2.2 corrige la géométrie responsive de la timeline", () => {
  assert.ok(css.includes("DABO Planning V2.2"));
  assert.ok(css.includes("grid-template-columns:68px minmax(0,1fr)"));
  assert.ok(css.includes("grid-template-columns:56px minmax(0,1fr)"));
});
