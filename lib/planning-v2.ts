import type { Task } from "@/lib/types";

export type PlanningScope = "all" | "me" | "household";

export type PlanningTaskSlot = {
  id: string;
  household_id: string;
  task_id: string;
  occurrence_date: string;
  start_time: string;
  end_time: string | null;
  created_by: string;
};

export function durationMinutes(durationKey: string | null): number | null {
  const values: Record<string, number> = { "5min": 5, "10min": 10, "15min": 15, "30min": 30, "45min": 45, "1h": 60, "1h+": 90 };
  return durationKey ? values[durationKey] ?? null : null;
}

export function addMinutesToTime(time: string, minutes: number | null): string | null {
  if (!minutes) return null;
  const [hours, mins] = time.slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return null;
  const total = hours * 60 + mins + minutes;
  if (total >= 24 * 60) return "23:59";
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function taskVisibleInPlanningScope(task: Task, scope: PlanningScope, meId: string | null | undefined): boolean {
  if (scope === "me") return Boolean(meId) && task.assigned_to === meId;
  // Une tâche DABO appartient au foyer. « Foyer » ne veut jamais dire « tout le monde sauf moi ».
  return true;
}

export function planningDayPart(hour: number): "morning" | "afternoon" | "evening" {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}
