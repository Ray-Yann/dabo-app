import type { Member, Task } from "@/lib/types";
import type { HouseholdWeeklyReport } from "@/lib/household-weekly-report";

export type HouseholdActionSuggestion = {
  taskId: string;
  taskName: string;
  taskPoints: number;
  currentMemberId: string | null;
  suggestedMemberId: string;
  suggestedMemberName: string;
  reason: "rebalance";
};

export function hasRebalanceInProgress(input: {
  report: HouseholdWeeklyReport;
  members: Member[];
  tasks: Task[];
  today: string;
}): boolean {
  if (input.report.suggestion !== "rebalance" || input.members.length < 2) return false;
  const shares = input.report.memberShares
    .filter((share) => input.members.some((member) => member.id === share.memberId))
    .sort((a, b) => a.percentage - b.percentage || a.points - b.points || a.memberId.localeCompare(b.memberId));
  if (shares.length < 2 || shares[0].percentage === shares[shares.length - 1].percentage) return false;
  const targetId = shares[0].memberId;
  return input.tasks.some((task) =>
    task.status === "pending" &&
    task.assigned_to === targetId &&
    (!task.due_date || task.due_date >= input.today)
  );
}

/**
 * DABO V2 — suggestion only. Pure and deterministic: this function never writes.
 * A proposal exists only when the weekly report already has enough confirmed
 * evidence to recommend a gentle rebalance. The household remains the decision-maker.
 */
export function buildHouseholdActionSuggestion(input: {
  report: HouseholdWeeklyReport;
  members: Member[];
  tasks: Task[];
  today: string;
}): HouseholdActionSuggestion | null {
  if (input.report.suggestion !== "rebalance" || input.members.length < 2) return null;

  const shares = input.report.memberShares
    .filter((share) => input.members.some((member) => member.id === share.memberId))
    .sort((a, b) => a.percentage - b.percentage || a.points - b.points || a.memberId.localeCompare(b.memberId));
  if (shares.length < 2 || shares[0].percentage === shares[shares.length - 1].percentage) return null;

  const target = input.members.find((member) => member.id === shares[0].memberId);
  if (!target) return null;

  // V1.1 anti-surcorrection: if the lower-contributing member already has a
  // pending current/future task, DABO waits for that planned load to resolve
  // before suggesting another redistribution. One gentle correction at a time.
  if (hasRebalanceInProgress(input)) return null;

  const candidates = input.tasks
    .filter((task) => task.status === "pending")
    .filter((task) => !task.due_date || task.due_date >= input.today)
    .filter((task) => task.assigned_to !== target.id)
    .sort((a, b) => {
      const aUnassigned = a.assigned_to ? 1 : 0;
      const bUnassigned = b.assigned_to ? 1 : 0;
      if (aUnassigned !== bUnassigned) return aUnassigned - bUnassigned;
      const due = (a.due_date || "9999-12-31").localeCompare(b.due_date || "9999-12-31");
      if (due !== 0) return due;
      if (b.weight_points !== a.weight_points) return b.weight_points - a.weight_points;
      return a.id.localeCompare(b.id);
    });

  const task = candidates[0];
  if (!task) return null;
  return {
    taskId: task.id,
    taskName: task.name,
    taskPoints: task.weight_points,
    currentMemberId: task.assigned_to,
    suggestedMemberId: target.id,
    suggestedMemberName: target.first_name,
    reason: "rebalance",
  };
}
