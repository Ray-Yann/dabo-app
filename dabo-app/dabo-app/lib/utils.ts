export function genInviteCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const l = Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
  const n = Math.floor(100 + Math.random() * 900);
  return `${l}-${n}`;
}

export function relativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();

  // Compare calendar days in the user's local timezone rather than elapsed
  // 24-hour periods. An item bought before midnight should become "hier"
  // after midnight, even if fewer than 24 hours have elapsed.
  const dateDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const todayDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.max(0, Math.round((todayDay - dateDay) / (1000 * 60 * 60 * 24)));

  if (diffDays === 0) return "aujourd'hui";
  if (diffDays === 1) return "hier";
  if (diffDays < 7) return `il y a ${diffDays} jours`;
  if (diffDays < 14) return "il y a 1 semaine";
  return `il y a ${Math.floor(diffDays / 7)} semaines`;
}

export function startOfWeek(): Date {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // lundi = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

export function dueDateLabel(dateStr: string, t: (key: string) => string): string {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return t("date_today");
  if (dateStr === tomorrow) return t("date_tomorrow");
  if (dateStr < today) return `${t("date_overdue")} (${dateStr})`;
  return dateStr;
}

export const MEMBER_COLORS = ["#7C8F6E", "#4F6B75", "#7A4B5C", "#B98A2E", "#5B6B8C"];

export function memberColor(members: { id: string; avatar_color?: string | null }[], memberId: string | null): string {
  if (!memberId) return "#C9C4B2";
  const member = members.find((m) => m.id === memberId);
  if (member?.avatar_color) return member.avatar_color;
  const idx = members.findIndex((m) => m.id === memberId);
  return MEMBER_COLORS[idx >= 0 ? idx % MEMBER_COLORS.length : 0];
}

export function computeMemberPoints(
  members: { id: string; first_name: string }[],
  tasks: { status: string; assigned_to: string | null; completed_at: string | null; weight_points: number }[],
  since: Date
) {
  const start = since.getTime();
  return members.map((m) => ({
    id: m.id,
    first_name: m.first_name,
    pts: tasks
      .filter((t) => t.status === "done" && t.assigned_to === m.id && t.completed_at && new Date(t.completed_at).getTime() >= start)
      .reduce((s, t) => s + t.weight_points, 0),
  }));
}

// Calcule la prochaine occurrence d'un événement : pour un événement
// récurrent, avance à la même date l'année prochaine si celle de cette année
// est déjà passée. Pour un événement ponctuel, retourne sa date telle quelle.
export function nextOccurrence(eventDate: string, recurring: boolean): Date {
  const original = new Date(eventDate + "T00:00:00");
  if (!recurring) return original;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const anchorMonth = original.getMonth();
  const anchorDay = original.getDate();
  const occurrenceForYear = (year: number) => {
    const lastDayOfMonth = new Date(year, anchorMonth + 1, 0).getDate();
    return new Date(year, anchorMonth, Math.min(anchorDay, lastDayOfMonth));
  };

  let next = occurrenceForYear(today.getFullYear());
  if (next.getTime() < today.getTime()) {
    next = occurrenceForYear(today.getFullYear() + 1);
  }
  return next;
}

export function daysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// Convertit des points en pourcentages, avec la méthode des plus grands
// restes : garantit que le total affiché fait toujours exactement 100%,
// jamais 99% ou 101% à cause d'arrondis indépendants.
export function computeMemberPercentages(
  pointsByMember: { id: string; pts: number }[]
): Map<string, number> {
  const total = pointsByMember.reduce((s, m) => s + m.pts, 0);
  const result = new Map<string, number>();
  if (total === 0) {
    pointsByMember.forEach((m) => result.set(m.id, 0));
    return result;
  }
  const withRemainders = pointsByMember.map((m) => {
    const exact = (m.pts / total) * 100;
    return { id: m.id, floor: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let assigned = withRemainders.reduce((s, m) => s + m.floor, 0);
  withRemainders.forEach((m) => result.set(m.id, m.floor));
  const sortedByRemainder = [...withRemainders].sort((a, b) => b.remainder - a.remainder);
  let i = 0;
  while (assigned < 100 && i < sortedByRemainder.length) {
    const id = sortedByRemainder[i].id;
    result.set(id, (result.get(id) || 0) + 1);
    assigned++;
    i++;
  }
  return result;
}

export type RoutineFrequency = "daily" | "weekly" | "biweekly" | "monthly" | "yearly" | "custom";

function parseCivilDate(value: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid civil date: ${value}`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function formatCivilDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addDaysCivil(value: string, days: number): string {
  const { year, month, day } = parseCivilDate(value);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return formatCivilDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

function addMonthsAnchored(value: string, months: number, anchorDay: number): string {
  const { year, month } = parseCivilDate(value);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const y = target.getUTCFullYear();
  const m = target.getUTCMonth() + 1;
  return formatCivilDate(y, m, Math.min(anchorDay, daysInMonth(y, m)));
}

function addYearsAnchored(value: string, years: number, anchorMonth: number, anchorDay: number): string {
  const { year } = parseCivilDate(value);
  const y = year + years;
  return formatCivilDate(y, anchorMonth, Math.min(anchorDay, daysInMonth(y, anchorMonth)));
}

function weekdayCivil(value: string): number {
  const { year, month, day } = parseCivilDate(value);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function todayCivilDate(): string {
  const now = new Date();
  return formatCivilDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/**
 * Returns the first due date strictly after completedOn while preserving the
 * routine's original cadence. Missed occurrences are skipped, never recreated.
 * Dates are civil YYYY-MM-DD values; UTC is used only for calendar arithmetic.
 */
export function computeNextDueDate(
  currentDueDate: string,
  completedOn: string,
  frequency: RoutineFrequency,
  customDays: number[] = [],
  anchorDate?: string | null
): string {
  parseCivilDate(currentDueDate);
  parseCivilDate(completedOn);
  const anchor = parseCivilDate(anchorDate || currentDueDate);
  const validCustomDays = [...new Set(customDays)].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  if (frequency === "custom" && validCustomDays.length === 0) throw new Error("custom recurrence requires at least one weekday");

  function advanceOne(value: string): string {
    if (frequency === "daily") return addDaysCivil(value, 1);
    if (frequency === "weekly") return addDaysCivil(value, 7);
    if (frequency === "biweekly") return addDaysCivil(value, 14);
    if (frequency === "monthly") return addMonthsAnchored(value, 1, anchor.day);
    if (frequency === "yearly") return addYearsAnchored(value, 1, anchor.month, anchor.day);
    let candidate = value;
    do { candidate = addDaysCivil(candidate, 1); } while (!validCustomDays.includes(weekdayCivil(candidate)));
    return candidate;
  }

  // Always move at least one recurrence step. This matters when a task is
  // completed or skipped early: the next occurrence must never reuse the
  // current occurrence's due date.
  let next = advanceOne(currentDueDate);
  let guard = 0;
  while (next <= completedOn) {
    if (++guard > 4000) throw new Error("Could not compute next due date");
    next = advanceOne(next);
  }
  return next;
}
