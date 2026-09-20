import type { CalendarEvent, Member, Routine, Task } from "@/lib/types";
import { computeMemberPercentages } from "@/lib/utils";

export type DaboInsightType =
  | "overdue_task"
  | "upcoming_event"
  | "balance"
  | "assignment";

export type DaboInsightSeverity = "info" | "gentle" | "important";

export type DaboInsight = {
  id: string;
  type: DaboInsightType;
  priority: number;
  severity: DaboInsightSeverity;
  titleKey: string;
  messageKey: string;
  reasonKey: string;
  relatedEntityId?: string;
  suggestedMemberId?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type DaboEngineInput = {
  members: Member[];
  tasks: Task[];
  calendarEvents: CalendarEvent[];
  routines?: Routine[];
  /**
   * Civil date (YYYY-MM-DD). Injected so the engine stays deterministic and
   * easy to test. UI code should pass today's local civil date.
   */
  today: string;
};

export const DABO_ENGINE_RULES = {
  balanceWindowDays: 7,
  upcomingEventDays: 3,
  minCompletedTasksForBalance: 4,
  gentleBalanceShare: 60,
  importantBalanceShare: 70,
} as const;

const MS_PER_DAY = 86_400_000;

function parseCivilDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid civil date: ${value}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function civilDiffDays(from: string, to: string): number {
  return Math.round((parseCivilDate(to).getTime() - parseCivilDate(from).getTime()) / MS_PER_DAY);
}

function isoToCivilDate(value: string): string {
  const date = new Date(value);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function startOfBalanceWindow(today: string): string {
  const start = parseCivilDate(today);
  start.setUTCDate(start.getUTCDate() - (DABO_ENGINE_RULES.balanceWindowDays - 1));
  return [
    start.getUTCFullYear(),
    String(start.getUTCMonth() + 1).padStart(2, "0"),
    String(start.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function completedTasksInBalanceWindow(tasks: Task[], today: string): Task[] {
  const start = startOfBalanceWindow(today);
  return tasks.filter((task) => {
    if (task.status !== "done" || !task.completed_at || !task.assigned_to) return false;
    const completed = isoToCivilDate(task.completed_at);
    return completed >= start && completed <= today;
  });
}

function recentPointsByMember(members: Member[], tasks: Task[], today: string): Map<string, number> {
  const recent = completedTasksInBalanceWindow(tasks, today);
  const result = new Map<string, number>();
  members.forEach((member) => result.set(member.id, 0));

  recent.forEach((task) => {
    if (!task.assigned_to || !result.has(task.assigned_to)) return;
    result.set(task.assigned_to, (result.get(task.assigned_to) ?? 0) + task.weight_points);
  });

  return result;
}

function getNextRotationMember(members: Member[], lastMemberId: string | null | undefined): Member | null {
  if (members.length === 0) return null;
  const ordered = [...members].sort(
    (a, b) => a.rotation_order - b.rotation_order || a.created_at.localeCompare(b.created_at)
  );
  if (!lastMemberId) return ordered[0];

  const index = ordered.findIndex((member) => member.id === lastMemberId);
  if (index < 0) return ordered[0];
  return ordered[(index + 1) % ordered.length];
}

/**
 * Suggestion only: never writes to Supabase and never changes an assignment.
 * Recent contribution is the primary fairness signal. Existing household
 * rotation acts as a tie-breaker / continuity signal, and a recurring task's
 * last_assigned_member is respected when available.
 */
export function suggestMemberForTask(
  task: Task,
  members: Member[],
  tasks: Task[],
  routines: Routine[] = [],
  today: string
): Member | null {
  if (task.status !== "pending" || task.assigned_to || members.length === 0) return null;

  const points = recentPointsByMember(members, tasks, today);
  const minimum = Math.min(...members.map((member) => points.get(member.id) ?? 0));
  const leastLoaded = members.filter((member) => (points.get(member.id) ?? 0) === minimum);

  const routine = task.routine_id
    ? routines.find((candidate) => candidate.id === task.routine_id)
    : undefined;
  const rotationCandidate = getNextRotationMember(members, routine?.last_assigned_member);

  if (rotationCandidate && leastLoaded.some((member) => member.id === rotationCandidate.id)) {
    return rotationCandidate;
  }

  return [...leastLoaded].sort(
    (a, b) => a.rotation_order - b.rotation_order || a.created_at.localeCompare(b.created_at)
  )[0] ?? null;
}

function buildOverdueInsights(tasks: Task[], today: string): DaboInsight[] {
  return tasks
    .filter((task) => task.status === "pending" && task.due_date && task.due_date < today)
    .map((task) => {
      const daysLate = Math.max(1, civilDiffDays(task.due_date!, today));
      return {
        id: `overdue_task:${task.id}`,
        type: "overdue_task" as const,
        priority: 100 + Math.min(daysLate, 30),
        severity: daysLate >= 3 || task.urgent ? ("important" as const) : ("gentle" as const),
        titleKey: "dabo_insight_overdue_title",
        messageKey: "dabo_insight_overdue_message",
        reasonKey: "dabo_insight_overdue_reason",
        relatedEntityId: task.id,
        metadata: {
          daysLate,
          urgent: task.urgent,
          dueDate: task.due_date,
        },
      };
    });
}

function nextCalendarOccurrence(eventDate: string, recurring: boolean, today: string): string {
  parseCivilDate(eventDate);
  parseCivilDate(today);
  if (!recurring) return eventDate;

  const [, month, day] = eventDate.split("-").map(Number);
  const todayDate = parseCivilDate(today);
  let year = todayDate.getUTCFullYear();
  const candidateDay = Math.min(day, new Date(Date.UTC(year, month, 0)).getUTCDate());
  let candidate = [
    year,
    String(month).padStart(2, "0"),
    String(candidateDay).padStart(2, "0"),
  ].join("-");

  if (candidate < today) {
    year += 1;
    const nextDay = Math.min(day, new Date(Date.UTC(year, month, 0)).getUTCDate());
    candidate = [
      year,
      String(month).padStart(2, "0"),
      String(nextDay).padStart(2, "0"),
    ].join("-");
  }

  return candidate;
}

function buildUpcomingEventInsights(events: CalendarEvent[], today: string): DaboInsight[] {
  return events.flatMap((event) => {
    const occurrenceCivil = nextCalendarOccurrence(event.event_date, event.recurring, today);
    const daysAway = civilDiffDays(today, occurrenceCivil);

    if (daysAway < 0 || daysAway > DABO_ENGINE_RULES.upcomingEventDays) return [];

    return [{
      id: `upcoming_event:${event.id}:${occurrenceCivil}`,
      type: "upcoming_event" as const,
      priority: 70 + (DABO_ENGINE_RULES.upcomingEventDays - daysAway),
      severity: daysAway <= 1 ? ("gentle" as const) : ("info" as const),
      titleKey: "dabo_insight_event_title",
      messageKey: "dabo_insight_event_message",
      reasonKey: "dabo_insight_event_reason",
      relatedEntityId: event.id,
      metadata: {
        daysAway,
        eventDate: occurrenceCivil,
      },
    }];
  });
}

function buildBalanceInsight(members: Member[], tasks: Task[], today: string): DaboInsight[] {
  if (members.length < 2) return [];

  const recent = completedTasksInBalanceWindow(tasks, today);
  if (recent.length < DABO_ENGINE_RULES.minCompletedTasksForBalance) return [];

  const points = recentPointsByMember(members, tasks, today);
  const pointsArray = members.map((member) => ({ id: member.id, pts: points.get(member.id) ?? 0 }));
  const percentages = computeMemberPercentages(pointsArray);
  const highest = members
    .map((member) => ({ member, share: percentages.get(member.id) ?? 0 }))
    .sort((a, b) => b.share - a.share)[0];

  if (!highest || highest.share < DABO_ENGINE_RULES.gentleBalanceShare) return [];

  const important = highest.share >= DABO_ENGINE_RULES.importantBalanceShare;
  return [{
    id: `balance:${startOfBalanceWindow(today)}:${today}`,
    type: "balance",
    priority: important ? 65 : 55,
    severity: important ? "important" : "gentle",
    titleKey: important ? "dabo_insight_balance_important_title" : "dabo_insight_balance_title",
    messageKey: important ? "dabo_insight_balance_important_message" : "dabo_insight_balance_message",
    reasonKey: "dabo_insight_balance_reason",
    metadata: {
      windowDays: DABO_ENGINE_RULES.balanceWindowDays,
      completedTaskCount: recent.length,
      highestShare: highest.share,
      highestMemberId: highest.member.id,
    },
  }];
}

function buildAssignmentInsights(
  members: Member[],
  tasks: Task[],
  routines: Routine[],
  today: string
): DaboInsight[] {
  return tasks
    .filter((task) => task.status === "pending" && !task.assigned_to)
    .flatMap((task) => {
      const suggested = suggestMemberForTask(task, members, tasks, routines, today);
      if (!suggested) return [];

      return [{
        id: `assignment:${task.id}:${suggested.id}`,
        type: "assignment" as const,
        priority: task.urgent ? 62 : 45,
        severity: task.urgent ? ("gentle" as const) : ("info" as const),
        titleKey: "dabo_insight_assignment_title",
        messageKey: "dabo_insight_assignment_message",
        reasonKey: "dabo_insight_assignment_reason",
        relatedEntityId: task.id,
        suggestedMemberId: suggested.id,
        metadata: {
          urgent: task.urgent,
          balanceWindowDays: DABO_ENGINE_RULES.balanceWindowDays,
        },
      }];
    });
}

/**
 * Phase 3 engine: pure recommendation layer.
 * It produces explanations and priorities only. Display selection (1–3 cards
 * on Aujourd'hui) belongs to Phase 4.
 */
export function generateDaboInsights(input: DaboEngineInput): DaboInsight[] {
  parseCivilDate(input.today);
  const routines = input.routines ?? [];

  return [
    ...buildOverdueInsights(input.tasks, input.today),
    ...buildUpcomingEventInsights(input.calendarEvents, input.today),
    ...buildBalanceInsight(input.members, input.tasks, input.today),
    ...buildAssignmentInsights(input.members, input.tasks, routines, input.today),
  ].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}
