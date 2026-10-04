import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const page = fs.readFileSync("app/app/calendrier/page.tsx", "utf8");
const migration = fs.readFileSync("supabase/migrations/2026-10-04-planning-v2-1.sql", "utf8");
const css = fs.readFileSync("app/globals.css", "utf8");

test("Planning V2.1 fournit une vraie journée navigable et une timeline", () => {
  assert.ok(page.includes('planningMode === "day"'));
  assert.ok(page.includes('className="dabo-timeline"'));
  assert.ok(page.includes("movePlanningDay"));
});

test("Planning V2.1 permet de placer une tâche avec sa durée", () => {
  assert.ok(page.includes("planning_task_slots"));
  assert.ok(page.includes("saveTaskSlot"));
  assert.ok(page.includes("durationMinutes(task.duration_key)"));
});

test("Planning V2.1 conserve événements, rappels et préparation responsable", () => {
  assert.ok(page.includes('eventKind === "reminder"'));
  assert.ok(page.includes("calendar_event_responsibilities"));
  assert.ok(page.includes("responsibilityAssignee"));
});

test("Planning V2.1 protège les nouvelles données par RLS", () => {
  assert.ok(migration.includes("alter table public.planning_task_slots enable row level security"));
  assert.ok(migration.includes("alter table public.calendar_event_responsibilities enable row level security"));
  assert.ok(migration.includes("private_owner_id"));
});

test("Planning V2.1 possède une surface premium responsive", () => {
  assert.ok(css.includes("DABO Planning V2.1"));
  assert.ok(css.includes(".dabo-day-planner"));
  assert.ok(css.includes("@media(max-width:480px)"));
});
