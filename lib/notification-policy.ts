export type NotificationDomain = "tasks" | "calendar" | "finance";

export type NotificationCandidate = {
  id: string;
  domain: NotificationDomain;
  label: string;
  messageKey: string;
  params: Record<string, string>;
  priority: number;
};

const TASK_OVERDUE_MILESTONES = new Set([1, 3, 7, 14, 30]);
const BILL_OVERDUE_MILESTONES = new Set([1, 3, 7, 14, 30]);

export function daysBetween(date: string, today: string) {
  const a = new Date(`${date}T00:00:00Z`).getTime();
  const b = new Date(`${today}T00:00:00Z`).getTime();
  return Math.round((a - b) / 86_400_000);
}

export function taskNotificationCandidate(input: {
  id: string;
  name: string;
  dueDate: string | null;
  today: string;
}): NotificationCandidate | null {
  if (!input.dueDate) return null;
  const delta = daysBetween(input.dueDate, input.today);
  if (delta > 0) return null;

  if (delta === 0) {
    return {
      id: `task:${input.id}:due`,
      domain: "tasks",
      label: input.name,
      messageKey: "notif_task_due",
      params: { name: input.name },
      priority: 80,
    };
  }

  const daysLate = Math.abs(delta);
  if (!TASK_OVERDUE_MILESTONES.has(daysLate)) return null;
  return {
    id: `task:${input.id}:late:${daysLate}`,
    domain: "tasks",
    label: input.name,
    messageKey: "notif_task_overdue",
    params: { name: input.name },
    priority: 95 + Math.min(daysLate, 30),
  };
}

export function billNotificationCandidate(input: {
  id: string;
  label: string;
  dueOn: string;
  today: string;
}): NotificationCandidate | null {
  const delta = daysBetween(input.dueOn, input.today);

  if (delta === 3) {
    return {
      id: `bill:${input.id}:soon`,
      domain: "finance",
      label: input.label,
      messageKey: "notif_bill_due_soon",
      params: { name: input.label },
      priority: 75,
    };
  }
  if (delta === 0) {
    return {
      id: `bill:${input.id}:due`,
      domain: "finance",
      label: input.label,
      messageKey: "notif_bill_due_today",
      params: { name: input.label },
      priority: 100,
    };
  }
  if (delta < 0) {
    const daysLate = Math.abs(delta);
    if (!BILL_OVERDUE_MILESTONES.has(daysLate)) return null;
    return {
      id: `bill:${input.id}:late:${daysLate}`,
      domain: "finance",
      label: input.label,
      messageKey: "notif_bill_overdue",
      params: { name: input.label },
      priority: 110 + Math.min(daysLate, 30),
    };
  }
  return null;
}

export function eventNotificationCandidate(input: {
  id: string;
  title: string;
  daysUntilOccurrence: number;
  reminderDaysBefore: number;
}): NotificationCandidate | null {
  if (
    input.daysUntilOccurrence !== 0 &&
    input.daysUntilOccurrence !== input.reminderDaysBefore
  ) {
    return null;
  }

  return {
    id: `event:${input.id}:${input.daysUntilOccurrence}`,
    domain: "calendar",
    label: input.title,
    messageKey: "notif_event_single",
    params: { title: input.title },
    priority: input.daysUntilOccurrence === 0 ? 90 : 70,
  };
}

export function buildDailyDigest(candidates: NotificationCandidate[]) {
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort((a, b) => b.priority - a.priority || a.label.localeCompare(b.label));
  const first = sorted[0];
  const domains = new Set(sorted.map((item) => item.domain));
  const url = domains.size === 1
    ? first.domain === "tasks"
      ? "/app/taches"
      : first.domain === "calendar"
        ? "/app/calendrier"
        : "/app/equilibre/budget"
    : "/app";

  return {
    first,
    count: sorted.length,
    url,
    candidateIds: sorted.map((item) => item.id),
  };
}
