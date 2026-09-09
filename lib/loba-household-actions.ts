import { DURATION_OPTIONS, EFFORT_OPTIONS, computeTaskPoints } from "@/lib/types";

export type LobaShoppingAddAction = {
  type: "shopping.add";
  item: string;
  quantity: string | null;
};

export type LobaTaskAddAction = {
  type: "task.add";
  name: string;
  dueDate: string | null;
  assignedTo: string | null;
  urgent: boolean;
  durationKey: string;
  effortLevel: string;
};

export type LobaCalendarAddAction = {
  type: "calendar.add";
  title: string;
  eventDate: string;
  visibility: "household" | "personal";
  recurring: false;
};

export type LobaHouseholdAction = LobaShoppingAddAction | LobaTaskAddAction | LobaCalendarAddAction;

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

function validCivilDate(value: unknown): string | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y,m,d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y,m-1,d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m-1 || date.getUTCDate() !== d) return undefined;
  return value;
}

export function normalizeHouseholdAction(value: unknown): LobaHouseholdAction | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;

  if (row.type === "shopping.add") {
    const item = cleanText(row.item, 160);
    if (!item) return null;
    const quantity = cleanText(row.quantity, 80) || null;
    return { type: "shopping.add", item, quantity };
  }

  if (row.type === "task.add") {
    const name = cleanText(row.name, 160);
    const dueDate = validCivilDate(row.dueDate);
    const assignedTo = row.assignedTo === null || row.assignedTo === "" ? null : cleanText(row.assignedTo, 80);
    const durationKey = cleanText(row.durationKey, 20);
    const effortLevel = cleanText(row.effortLevel, 20);
    if (!name || dueDate === undefined || assignedTo === "" || typeof row.urgent !== "boolean") return null;
    if (!DURATION_OPTIONS.some((x) => x.key === durationKey)) return null;
    if (!EFFORT_OPTIONS.some((x) => x.key === effortLevel)) return null;
    return { type: "task.add", name, dueDate, assignedTo, urgent: row.urgent, durationKey, effortLevel };
  }

  if (row.type === "calendar.add") {
    const title = cleanText(row.title, 160);
    const eventDate = validCivilDate(row.eventDate);
    const visibility = row.visibility === "household" || row.visibility === "personal" ? row.visibility : null;
    if (!title || !eventDate || !visibility || row.recurring !== false) return null;
    return { type: "calendar.add", title, eventDate, visibility, recurring: false };
  }

  return null;
}

export function taskActionPoints(action: LobaTaskAddAction) {
  return computeTaskPoints(action.durationKey, action.effortLevel);
}

export function parseLobaHouseholdEnvelope(raw: string): { answer: string; proposedAction: LobaHouseholdAction | null } {
  const fallback = { answer: raw.trim(), proposedAction: null as LobaHouseholdAction | null };
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const answer = typeof parsed.answer === "string" ? parsed.answer.trim() : "";
    if (!answer) return fallback;
    return { answer, proposedAction: normalizeHouseholdAction(parsed.proposedAction) };
  } catch {
    return fallback;
  }
}
