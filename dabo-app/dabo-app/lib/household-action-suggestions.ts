import type { Member, Task } from "@/lib/types";
import type { HouseholdWeeklyReport } from "@/lib/household-weekly-report";
import type { TaskContribution } from "@/lib/task-contributions";

export type HouseholdActionSuggestion = {
  taskId: string;
  taskName: string;
  taskPoints: number;
  currentMemberId: string | null;
  suggestedMemberId: string;
  suggestedMemberName: string;
  reason: "rebalance";
};

export type HouseholdAcceptedAction = {
  id: string;
  household_id: string;
  task_id: string;
  suggested_member_id: string;
  previous_assigned_to: string | null;
  reason: "rebalance";
  accepted_at: string;
};

export type RebalanceActionState = "none" | "in_progress" | "awaiting_confirmation" | "measured" | "released";

export function getRebalanceActionState(input: {
  report: HouseholdWeeklyReport;
  members: Member[];
  tasks: Task[];
  acceptedActions?: HouseholdAcceptedAction[];
  contributions?: TaskContribution[];
}): RebalanceActionState {
  if (input.report.suggestion !== "rebalance" || input.members.length < 2) return "none";
  const shares = input.report.memberShares
    .filter((share) => input.members.some((member) => member.id === share.memberId))
    .sort((a, b) => a.percentage - b.percentage || a.points - b.points || a.memberId.localeCompare(b.memberId));
  if (shares.length < 2 || shares[0].percentage === shares[shares.length - 1].percentage) return "none";
  const targetId = shares[0].memberId;
  const action = [...(input.acceptedActions || [])]
    .filter((row) => row.reason === "rebalance" && row.suggested_member_id === targetId)
    .sort((a, b) => b.accepted_at.localeCompare(a.accepted_at))[0];
  if (!action) return "none";
  const task = input.tasks.find((row) => row.id === action.task_id);
  if (!task || task.assigned_to !== targetId) return "released";
  if (task.status === "pending") return "in_progress";
  const contribution = (input.contributions || []).find((row) => row.task_id === action.task_id && !row.cancelled_at);
  if (!contribution || contribution.performer_status !== "confirmed") return "awaiting_confirmation";
  return "measured";
}

export function hasRebalanceInProgress(input: {
  report: HouseholdWeeklyReport;
  members: Member[];
  tasks: Task[];
  acceptedActions?: HouseholdAcceptedAction[];
  contributions?: TaskContribution[];
}): boolean {
  const state = getRebalanceActionState(input);
  return state === "in_progress" || state === "awaiting_confirmation";
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
  acceptedActions?: HouseholdAcceptedAction[];
  contributions?: TaskContribution[];
}): HouseholdActionSuggestion | null {
  if (input.report.suggestion !== "rebalance" || input.members.length < 2) return null;

  const shares = input.report.memberShares
    .filter((share) => input.members.some((member) => member.id === share.memberId))
    .sort((a, b) => a.percentage - b.percentage || a.points - b.points || a.memberId.localeCompare(b.memberId));
  if (shares.length < 2 || shares[0].percentage === shares[shares.length - 1].percentage) return null;

  const target = input.members.find((member) => member.id === shares[0].memberId);
  if (!target) return null;

  // V1.2: only an action explicitly accepted through DABO can pause another
  // redistribution. Ordinary household assignments must never be mistaken for
  // a DABO correction. Completed actions wait for confirmed contribution data.
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
