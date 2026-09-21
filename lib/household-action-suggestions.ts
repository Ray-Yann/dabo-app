import type { Member, Task } from "@/lib/types";
import type { HouseholdWeeklyReport } from "@/lib/household-weekly-report";
import type { TaskContribution } from "@/lib/task-contributions";
import { hasReducedAvailability, type MemberLifeContext } from "@/lib/life-context";

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

export type HouseholdMemberShare = {
  memberId: string;
  points: number;
  percentage: number;
};

export function selectRebalanceTarget(input: {
  members: Member[];
  memberShares: HouseholdMemberShare[];
}): Member | null {
  if (input.members.length < 2) return null;

  const shares = input.memberShares
    .filter((share) => input.members.some((member) => member.id === share.memberId))
    .sort(
      (a, b) =>
        a.percentage - b.percentage ||
        a.points - b.points ||
        a.memberId.localeCompare(b.memberId)
    );

  if (shares.length < 2) return null;

  const lowestPercentage = shares[0].percentage;
  const lowestShares = shares.filter(
    (share) => share.percentage === lowestPercentage
  );

  // A personal rebalance suggestion requires one clearly identified member.
  // When several members share the lowest contribution, DABO stays neutral.
  if (lowestShares.length !== 1) return null;

  return (
    input.members.find((member) => member.id === lowestShares[0].memberId) ?? null
  );
}

export function selectRebalanceTaskCandidates(input: {
  tasks: Task[];
  today: string;
  targetMemberId?: string | null;
  excludeTargetAssignments?: boolean;
}): Task[] {
  const targetMemberId = input.targetMemberId ?? null;

  return input.tasks
    .filter(
      (task) =>
        task.status === "pending" &&
        (!task.due_date || task.due_date >= input.today)
    )
    .filter(
      (task) =>
        !input.excludeTargetAssignments ||
        !targetMemberId ||
        task.assigned_to !== targetMemberId
    )
    .sort((a, b) => {
      const aUnassigned = a.assigned_to ? 1 : 0;
      const bUnassigned = b.assigned_to ? 1 : 0;
      if (aUnassigned !== bUnassigned) return aUnassigned - bUnassigned;

      if (targetMemberId && a.assigned_to && b.assigned_to) {
        const aAlreadyTarget = a.assigned_to === targetMemberId ? 1 : 0;
        const bAlreadyTarget = b.assigned_to === targetMemberId ? 1 : 0;
        if (aAlreadyTarget !== bAlreadyTarget) {
          return aAlreadyTarget - bAlreadyTarget;
        }
      }

      const due = (a.due_date || "9999-12-31").localeCompare(
        b.due_date || "9999-12-31"
      );
      if (due !== 0) return due;

      const weight = (b.weight_points ?? 0) - (a.weight_points ?? 0);
      if (weight !== 0) return weight;

      return a.id.localeCompare(b.id);
    });
}

export function getRebalanceActionState(input: {
  report: HouseholdWeeklyReport;
  members: Member[];
  tasks: Task[];
  acceptedActions?: HouseholdAcceptedAction[];
  contributions?: TaskContribution[];
}): RebalanceActionState {
  if (input.report.suggestion !== "rebalance" || input.members.length < 2) return "none";
  const target = selectRebalanceTarget({
    members: input.members,
    memberShares: input.report.memberShares,
  });
  if (!target) return "none";
  const targetId = target.id;
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
  lifeContexts?: MemberLifeContext[];
}): HouseholdActionSuggestion | null {
  if (input.report.suggestion !== "rebalance" || input.members.length < 2) return null;

  const target = selectRebalanceTarget({
    members: input.members,
    memberShares: input.report.memberShares,
  });
  if (!target) return null;

  // P2.2: Life Context qualifies the action layer only.
  // It never changes contribution shares, points, or historical facts.
  if (
    hasReducedAvailability(
      input.lifeContexts || [],
      target.id,
      input.today
    )
  ) {
    return null;
  }

  // V1.2: only an action explicitly accepted through DABO can pause another
  // redistribution. Ordinary household assignments must never be mistaken for
  // a DABO correction. Completed actions wait for confirmed contribution data.
  if (hasRebalanceInProgress(input)) return null;

  const candidates = selectRebalanceTaskCandidates({
    tasks: input.tasks,
    today: input.today,
    targetMemberId: target.id,
    excludeTargetAssignments: true,
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
