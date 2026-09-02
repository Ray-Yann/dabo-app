export function genInviteCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const l = Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
  const n = Math.floor(100 + Math.random() * 900);
  return `${l}-${n}`;
}

export function relativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

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
  const next = new Date(today.getFullYear(), original.getMonth(), original.getDate());
  if (next.getTime() < today.getTime()) {
    next.setFullYear(next.getFullYear() + 1);
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
