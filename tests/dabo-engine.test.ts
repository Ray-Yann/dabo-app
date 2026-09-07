import assert from "node:assert/strict";
import test from "node:test";

import { generateDaboInsights, suggestMemberForTask } from "@/lib/dabo-engine";
import type { CalendarEvent, Member, Routine, Task } from "@/lib/types";

const TODAY = "2026-09-07";

function member(id: string, rotationOrder: number): Member {
  return {
    id,
    household_id: "household",
    user_id: `user-${id}`,
    first_name: id,
    role: "member",
    rotation_order: rotationOrder,
    avatar_color: null,
    language: "fr",
    dark_mode: false,
    created_at: `2026-01-0${rotationOrder + 1}T00:00:00.000Z`,
    left_at: null,
  };
}

function task(overrides: Partial<Task> & Pick<Task, "id" | "name">): Task {
  return {
    id: overrides.id,
    household_id: "household",
    routine_id: null,
    name: overrides.name,
    weight_points: 10,
    duration_key: "10min",
    effort_level: "faible",
    assigned_to: null,
    status: "pending",
    urgent: false,
    due_date: null,
    completed_at: null,
    created_at: "2026-09-01T12:00:00.000Z",
    ...overrides,
  };
}

function event(overrides: Partial<CalendarEvent> & Pick<CalendarEvent, "id" | "title" | "event_date">): CalendarEvent {
  return {
    id: overrides.id,
    household_id: "household",
    created_by: "ray",
    title: overrides.title,
    event_date: overrides.event_date,
    recurring: false,
    reminder_days_before: 1,
    visibility: "household",
    private_owner_id: null,
    created_at: "2026-09-01T12:00:00.000Z",
    ...overrides,
  };
}

const ray = member("ray", 0);
const manga = member("manga", 1);

test("signale une tâche en retard avec le bon niveau de priorité", () => {
  const insights = generateDaboInsights({
    members: [ray, manga],
    tasks: [task({ id: "late", name: "Sortir les poubelles", due_date: "2026-09-04" })],
    calendarEvents: [],
    today: TODAY,
  });

  const overdue = insights.find((insight) => insight.type === "overdue_task");
  assert.equal(overdue?.severity, "important");
  assert.equal(overdue?.metadata?.daysLate, 3);
});

test("ignore une tâche à venir et une tâche déjà terminée", () => {
  const insights = generateDaboInsights({
    members: [ray, manga],
    tasks: [
      task({ id: "future", name: "À venir", due_date: "2026-09-08" }),
      task({ id: "done", name: "Terminée", due_date: "2026-09-01", status: "done", completed_at: "2026-09-02T10:00:00.000Z", assigned_to: ray.id }),
    ],
    calendarEvents: [],
    today: TODAY,
  });

  assert.equal(insights.some((insight) => insight.type === "overdue_task"), false);
});

test("signale uniquement les événements situés dans les trois prochains jours", () => {
  const insights = generateDaboInsights({
    members: [ray, manga],
    tasks: [],
    calendarEvents: [
      event({ id: "soon", title: "Permis", event_date: "2026-09-10" }),
      event({ id: "later", title: "Vacances", event_date: "2026-09-11" }),
    ],
    today: TODAY,
  });

  assert.deepEqual(
    insights.filter((insight) => insight.type === "upcoming_event").map((insight) => insight.relatedEntityId),
    ["soon"]
  );
});

test("reporte au 28 février un anniversaire récurrent créé le 29 février", () => {
  const insights = generateDaboInsights({
    members: [ray, manga],
    tasks: [],
    calendarEvents: [event({ id: "leap", title: "Anniversaire", event_date: "2024-02-29", recurring: true })],
    today: "2027-02-27",
  });

  const upcoming = insights.find((insight) => insight.type === "upcoming_event");
  assert.equal(upcoming?.metadata?.eventDate, "2027-02-28");
  assert.equal(upcoming?.metadata?.daysAway, 1);
});

test("détecte un déséquilibre seulement avec au moins quatre tâches récentes", () => {
  const completed = [0, 1, 2, 3].map((index) => task({
    id: `done-${index}`,
    name: `Tâche ${index}`,
    status: "done",
    assigned_to: index < 3 ? ray.id : manga.id,
    completed_at: `2026-09-0${index + 3}T12:00:00.000Z`,
    weight_points: 10,
  }));

  const insights = generateDaboInsights({ members: [ray, manga], tasks: completed, calendarEvents: [], today: TODAY });
  const balance = insights.find((insight) => insight.type === "balance");
  assert.equal(balance?.severity, "important");
  assert.equal(balance?.metadata?.highestShare, 75);
});

test("suggère le membre ayant le moins contribué récemment", () => {
  const pending = task({ id: "pending", name: "Aspirateur" });
  const history = [0, 1, 2, 3].map((index) => task({
    id: `ray-${index}`,
    name: `Historique ${index}`,
    status: "done",
    assigned_to: ray.id,
    completed_at: "2026-09-06T12:00:00.000Z",
  }));

  assert.equal(suggestMemberForTask(pending, [ray, manga], [...history, pending], [], TODAY)?.id, manga.id);
});

test("utilise la rotation comme départage sans modifier la tâche", () => {
  const pending = task({ id: "rotation", name: "Vaisselle", routine_id: "routine" });
  const routine: Routine = {
    id: "routine",
    household_id: "household",
    name: "Vaisselle",
    weight_points: 10,
    duration_key: "10min",
    effort_level: "faible",
    frequency: "daily",
    custom_days: null,
    anchor_date: TODAY,
    active: true,
    ended_at: null,
    last_assigned_member: ray.id,
    created_at: "2026-01-01T00:00:00.000Z",
  };

  assert.equal(suggestMemberForTask(pending, [ray, manga], [pending], [routine], TODAY)?.id, manga.id);
  assert.equal(pending.assigned_to, null);
});
