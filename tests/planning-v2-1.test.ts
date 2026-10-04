import assert from "node:assert/strict";
import test from "node:test";
import { addMinutesToTime, durationMinutes, planningDayPart, taskVisibleInPlanningScope } from "../lib/planning-v2";
import type { Task } from "../lib/types";

const task = { id:"t", household_id:"h", routine_id:null, name:"Courses", weight_points:20, duration_key:"30min", effort_level:"faible", assigned_to:"me", status:"pending", urgent:false, due_date:"2026-10-05", completed_at:null, created_at:"2026-10-01" } satisfies Task;

test("Planning V2.1 conserve la sémantique foyer au lieu de tout-le-monde-sauf-moi", () => {
  assert.equal(taskVisibleInPlanningScope(task, "me", "me"), true);
  assert.equal(taskVisibleInPlanningScope(task, "household", "me"), true);
  assert.equal(taskVisibleInPlanningScope(task, "all", "me"), true);
});

test("Planning V2.1 convertit les durées de tâches en vrais créneaux", () => {
  assert.equal(durationMinutes("30min"), 30);
  assert.equal(addMinutesToTime("18:30", 30), "19:00");
});

test("Planning V2.1 structure la journée sans micro-management", () => {
  assert.equal(planningDayPart(8), "morning");
  assert.equal(planningDayPart(15), "afternoon");
  assert.equal(planningDayPart(20), "evening");
});
