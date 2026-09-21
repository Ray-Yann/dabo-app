import { SupabaseClient } from "@supabase/supabase-js";
import { computeMemberPercentages } from "@/lib/utils";

export type TaskContribution = {
  id: string;
  task_id: string;
  household_id: string;
  completed_at: string;
  duration_key: string | null;
  effort_level: string | null;
  weight_points: number;
  performer_status: "confirmed" | "unknown";
  cancelled_at: string | null;
};

export type TaskContributionParticipant = {
  contribution_id: string;
  member_id: string;
  share_weight: number;
};

export type ContributionBalanceData = {
  contributions: TaskContribution[];
  participants: TaskContributionParticipant[];
};

export async function fetchContributionBalanceData(
  supabase: SupabaseClient,
  householdId: string
): Promise<ContributionBalanceData> {
  const { data: contributions, error: contributionError } = await supabase
    .from("task_contributions")
    .select("id, task_id, household_id, completed_at, duration_key, effort_level, weight_points, performer_status, cancelled_at")
    .eq("household_id", householdId)
    .is("cancelled_at", null);

  if (contributionError) throw contributionError;

  const contributionRows = (contributions || []) as TaskContribution[];
  if (contributionRows.length === 0) {
    return { contributions: [], participants: [] };
  }

  const contributionIds = contributionRows.map((row) => row.id);
  const { data: participants, error: participantError } = await supabase
    .from("task_contribution_participants")
    .select("contribution_id, member_id, share_weight")
    .in("contribution_id", contributionIds);

  if (participantError) throw participantError;

  return {
    contributions: contributionRows,
    participants: (participants || []) as TaskContributionParticipant[],
  };
}

export function computeContributionMemberPoints(
  memberIds: string[],
  contributions: TaskContribution[],
  participants: TaskContributionParticipant[],
  since: Date
): Map<string, number> {
  const totals = new Map(memberIds.map((id) => [id, 0]));
  const sinceMs = since.getTime();

  const participantsByContribution = new Map<string, TaskContributionParticipant[]>();
  for (const participant of participants) {
    const rows = participantsByContribution.get(participant.contribution_id) || [];
    rows.push(participant);
    participantsByContribution.set(participant.contribution_id, rows);
  }

  for (const contribution of contributions) {
    if (
      contribution.performer_status !== "confirmed" ||
      contribution.cancelled_at ||
      new Date(contribution.completed_at).getTime() < sinceMs
    ) {
      continue;
    }

    const rows = participantsByContribution.get(contribution.id) || [];
    const eligible = rows.filter((row) => totals.has(row.member_id));
    if (eligible.length === 0) continue;

    const totalWeight = eligible.reduce((sum, row) => sum + Math.max(0, Number(row.share_weight) || 0), 0);
    const fallbackWeight = eligible.length > 0 ? 1 / eligible.length : 0;
    for (const participant of eligible) {
      const ratio = totalWeight > 0 ? Math.max(0, Number(participant.share_weight) || 0) / totalWeight : fallbackWeight;
      totals.set(participant.member_id, (totals.get(participant.member_id) || 0) + contribution.weight_points * ratio);
    }
  }

  return totals;
}

export function countConfirmedContributionsSince(
  contributions: TaskContribution[],
  participants: TaskContributionParticipant[],
  since: Date
): number {
  const sinceMs = since.getTime();
  const participantCounts = new Map<string, number>();
  participants.forEach((row) => {
    participantCounts.set(row.contribution_id, (participantCounts.get(row.contribution_id) || 0) + 1);
  });

  return contributions.filter(
    (row) =>
      row.performer_status === "confirmed" &&
      !row.cancelled_at &&
      new Date(row.completed_at).getTime() >= sinceMs &&
      (participantCounts.get(row.id) || 0) > 0
  ).length;
}


export type ContributionPeriodSnapshot = {
  rows: TaskContribution[];
  confirmedContributions: number;
  pointsByMember: Map<string, number>;
  percentagesByMember: Map<string, number>;
  highestShare: number | null;
};

export const DEFAULT_MINIMUM_CONTRIBUTIONS = 4;

export function computeContributionPeriodSnapshot(input: {
  memberIds: string[];
  contributions: TaskContribution[];
  participants: TaskContributionParticipant[];
  start: Date;
  end: Date;
  minimumContributions?: number;
}): ContributionPeriodSnapshot {
  const minimumContributions = input.minimumContributions ?? DEFAULT_MINIMUM_CONTRIBUTIONS;
  const startMs = input.start.getTime();
  const endMs = input.end.getTime();
  const activeIds = new Set(input.memberIds);

  const rows = input.contributions.filter((row) => {
    const at = new Date(row.completed_at).getTime();
    return (
      row.performer_status === "confirmed" &&
      !row.cancelled_at &&
      at >= startMs &&
      at < endMs
    );
  });

  const participantContributionIds = new Set(
    input.participants
      .filter((row) => activeIds.has(row.member_id))
      .map((row) => row.contribution_id)
  );

  const confirmedContributions = rows.filter((row) =>
    participantContributionIds.has(row.id)
  ).length;

  const pointsByMember = computeContributionMemberPoints(
    input.memberIds,
    rows,
    input.participants,
    input.start
  );

  const percentagesByMember = computeMemberPercentages(
    input.memberIds.map((id) => ({
      id,
      pts: pointsByMember.get(id) || 0,
    }))
  );

  const highestShare =
    input.memberIds.length >= 2 &&
    confirmedContributions >= minimumContributions
      ? Math.max(
          ...input.memberIds.map((id) => percentagesByMember.get(id) || 0)
        )
      : null;

  return {
    rows,
    confirmedContributions,
    pointsByMember,
    percentagesByMember,
    highestShare,
  };
}
