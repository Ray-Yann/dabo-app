import type { CalendarEvent, Member, Routine, Task } from "@/lib/types";

export type DaboInsightType =
  | "overdue_task"
  | "upcoming_event"
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
  contributionPointsByMember: Map<string, number>;
  /**
   * Civil date (YYYY-MM-DD). Injected so the engine stays deterministic and
   * easy to test. UI code should pass today's local civil date.
   */
  today: string;
};

export const DABO_ENGINE_RULES = {
  upcomingEventDays: 3,
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
  contributionPointsByMember: Map<string, number>,
  routines: Routine[] = []
): Member | null {
  if (task.status !== "pending" || task.assigned_to || members.length === 0) return null;

  const minimum = Math.min(
    ...members.map((member) => contributionPointsByMember.get(member.id) ?? 0)
  );
  const leastLoaded = members.filter(
    (member) => (contributionPointsByMember.get(member.id) ?? 0) === minimum
  );

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

function buildAssignmentInsights(
  members: Member[],
  tasks: Task[],
  routines: Routine[],
  contributionPointsByMember: Map<string, number>
): DaboInsight[] {
  return tasks
    .filter((task) => task.status === "pending" && !task.assigned_to)
    .flatMap((task) => {
      const suggested = suggestMemberForTask(
        task,
        members,
        contributionPointsByMember,
        routines
      );
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
    ...buildAssignmentInsights(
      input.members,
      input.tasks,
      routines,
      input.contributionPointsByMember
    ),
  ].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}
