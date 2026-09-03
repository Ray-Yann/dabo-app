import { NextResponse } from "next/server";
import {
  generateDaboInsights,
  suggestMemberForTask,
  type DaboInsight,
} from "@/lib/dabo-engine";
import type { CalendarEvent, Member, Routine, Task } from "@/lib/types";

const TODAY = "2026-09-03";
const HOUSEHOLD = "self-test-household";

function member(id: string, rotationOrder: number): Member {
  return {
    id,
    household_id: HOUSEHOLD,
    user_id: `user-${id}`,
    first_name: id,
    role: rotationOrder === 0 ? "creator" : "member",
    rotation_order: rotationOrder,
    avatar_color: null,
    language: "fr",
    dark_mode: false,
    created_at: `2026-01-0${rotationOrder + 1}T00:00:00.000Z`,
  };
}

function task(
  id: string,
  points: number,
  assignedTo: string | null,
  status: "pending" | "done" = "done",
  options: Partial<Task> = {}
): Task {
  return {
    id,
    household_id: HOUSEHOLD,
    routine_id: null,
    name: id,
    weight_points: points,
    duration_key: null,
    effort_level: null,
    assigned_to: assignedTo,
    status,
    urgent: false,
    due_date: null,
    completed_at: status === "done" ? "2026-09-02T12:00:00.000Z" : null,
    created_at: "2026-09-01T08:00:00.000Z",
    ...options,
  };
}

function event(id: string, eventDate: string, recurring = false): CalendarEvent {
  return {
    id,
    household_id: HOUSEHOLD,
    created_by: "A",
    title: id,
    event_date: eventDate,
    recurring,
    reminder_days_before: 1,
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

function routine(id: string, lastAssignedMember: string | null): Routine {
  return {
    id,
    household_id: HOUSEHOLD,
    name: id,
    weight_points: 10,
    duration_key: null,
    effort_level: null,
    frequency: "weekly",
    custom_days: null,
    anchor_date: "2026-09-03",
    active: true,
    ended_at: null,
    last_assigned_member: lastAssignedMember,
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

function balanceInsight(tasks: Task[]): DaboInsight | undefined {
  return generateDaboInsights({
    members: [member("A", 0), member("B", 1)],
    tasks,
    calendarEvents: [],
    today: TODAY,
  }).find((insight) => insight.type === "balance");
}

type TestResult = { name: string; pass: boolean; details: string };

function result(name: string, pass: boolean, details: string): TestResult {
  return { name, pass, details };
}

export async function GET() {
  const members = [member("A", 0), member("B", 1)];
  const tests: TestResult[] = [];

  // 1. 55/45: enough data, but no balance signal.
  const ratio55 = [
    task("55-a1", 30, "A"),
    task("55-a2", 25, "A"),
    task("55-b1", 25, "B"),
    task("55-b2", 20, "B"),
  ];
  const b55 = balanceInsight(ratio55);
  tests.push(result("55/45 -> aucun signal", !b55, b55 ? `signal inattendu ${b55.severity}` : "aucun signal"));

  // 2. 60/40: gentle signal.
  const ratio60 = [
    task("60-a1", 30, "A"),
    task("60-a2", 30, "A"),
    task("60-b1", 20, "B"),
    task("60-b2", 20, "B"),
  ];
  const b60 = balanceInsight(ratio60);
  tests.push(result(
    "60/40 -> signal léger",
    b60?.severity === "gentle" && b60.metadata?.highestShare === 60,
    b60 ? `severity=${b60.severity}, highestShare=${String(b60.metadata?.highestShare)}` : "aucun signal"
  ));

  // 3. 70/30: important signal.
  const ratio70 = [
    task("70-a1", 35, "A"),
    task("70-a2", 35, "A"),
    task("70-b1", 15, "B"),
    task("70-b2", 15, "B"),
  ];
  const b70 = balanceInsight(ratio70);
  tests.push(result(
    "70/30 -> signal important",
    b70?.severity === "important" && b70.metadata?.highestShare === 70,
    b70 ? `severity=${b70.severity}, highestShare=${String(b70.metadata?.highestShare)}` : "aucun signal"
  ));

  // 4. Less than 4 completed tasks: no balance judgment.
  const tooFew = [task("few-a1", 40, "A"), task("few-a2", 30, "A"), task("few-b1", 10, "B")];
  const bFew = balanceInsight(tooFew);
  tests.push(result("moins de 4 tâches -> aucun signal", !bFew, bFew ? "signal inattendu" : "aucun signal"));

  // 5. Overdue pending task detection.
  const overdueTask = task("overdue", 10, "A", "pending", { due_date: "2026-09-01" });
  const overdue = generateDaboInsights({ members, tasks: [overdueTask], calendarEvents: [], today: TODAY })
    .find((insight) => insight.type === "overdue_task");
  tests.push(result(
    "tâche en retard -> détectée",
    Boolean(overdue && overdue.metadata?.daysLate === 2),
    overdue ? `daysLate=${String(overdue.metadata?.daysLate)}, priority=${overdue.priority}` : "aucun signal"
  ));

  // 6. Event inside 3 days is detected; recurring event calculation uses injected TODAY.
  const upcoming = generateDaboInsights({
    members,
    tasks: [],
    calendarEvents: [event("recurring-event", "2020-09-05", true), event("too-far", "2026-09-07")],
    today: TODAY,
  }).filter((insight) => insight.type === "upcoming_event");
  tests.push(result(
    "événement <= 3 jours -> détecté",
    upcoming.length === 1 && upcoming[0].relatedEntityId === "recurring-event" && upcoming[0].metadata?.daysAway === 2,
    `détectés=${upcoming.map((i) => `${i.relatedEntityId}:${String(i.metadata?.daysAway)}`).join(",") || "aucun"}`
  ));

  // 7. Assignment prefers the least-loaded member.
  const assignmentTarget = task("assign-me", 10, null, "pending");
  const loadHistory = [task("load-a", 80, "A"), task("load-b", 20, "B")];
  const suggested = suggestMemberForTask(assignmentTarget, members, [...loadHistory, assignmentTarget], [], TODAY);
  tests.push(result(
    "attribution -> membre le moins chargé",
    suggested?.id === "B",
    `suggestion=${suggested?.id ?? "aucune"}`
  ));

  // 8. When recent load is tied, recurrence rotation breaks the tie.
  const recurringTarget = task("rotation-target", 10, null, "pending", { routine_id: "r1" });
  const tiedHistory = [task("tie-a", 20, "A"), task("tie-b", 20, "B")];
  const suggestedRotation = suggestMemberForTask(
    recurringTarget,
    members,
    [...tiedHistory, recurringTarget],
    [routine("r1", "A")],
    TODAY
  );
  tests.push(result(
    "attribution à égalité -> rotation existante",
    suggestedRotation?.id === "B",
    `suggestion=${suggestedRotation?.id ?? "aucune"}`
  ));

  // 9. Priority order: overdue > upcoming > important balance > assignment.
  const priorityInsights = generateDaboInsights({
    members,
    tasks: [
      ...ratio70,
      task("priority-overdue", 10, "A", "pending", { due_date: "2026-09-01" }),
      task("priority-assignment", 10, null, "pending"),
    ],
    calendarEvents: [event("priority-event", "2026-09-04")],
    today: TODAY,
  });
  const firstByType = new Map<string, number>();
  priorityInsights.forEach((insight, index) => {
    if (!firstByType.has(insight.type)) firstByType.set(insight.type, index);
  });
  const orderPass =
    (firstByType.get("overdue_task") ?? 99) < (firstByType.get("upcoming_event") ?? 99) &&
    (firstByType.get("upcoming_event") ?? 99) < (firstByType.get("balance") ?? 99) &&
    (firstByType.get("balance") ?? 99) < (firstByType.get("assignment") ?? 99);
  tests.push(result(
    "priorités -> retard > événement > équilibre > attribution",
    orderPass,
    priorityInsights.map((i) => `${i.type}:${i.priority}`).join(" | ")
  ));

  const passed = tests.filter((test) => test.pass).length;
  const allPassed = passed === tests.length;

  return NextResponse.json({
    phase: "3.2",
    engine: "DABO Engine V1",
    today: TODAY,
    allPassed,
    score: `${passed}/${tests.length}`,
    tests,
    note: "Tests 100% synthétiques : aucune lecture/écriture Supabase et aucune donnée du foyer.",
  }, { status: allPassed ? 200 : 500 });
}
