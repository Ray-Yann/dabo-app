import type { Member } from "@/lib/types";
import { computeContributionMemberPoints, type TaskContribution, type TaskContributionParticipant } from "@/lib/task-contributions";
import { computeMemberPercentages } from "@/lib/utils";

export type HouseholdTrend = "improving" | "stable" | "watch" | "building";

export type HouseholdInsights = {
  trend: HouseholdTrend;
  currentCount: number;
  previousCount: number;
  currentHighestShare: number | null;
  previousHighestShare: number | null;
  enoughCurrentData: boolean;
  enoughComparisonData: boolean;
};

const DAY = 86_400_000;
const MIN_CONTRIBUTIONS = 4;

function startOfLocalDay(value: Date): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function contributionRowsInRange(contributions: TaskContribution[], start: Date, end: Date) {
  const from = start.getTime();
  const to = end.getTime();
  return contributions.filter((row) => {
    const at = new Date(row.completed_at).getTime();
    return row.performer_status === "confirmed" && !row.cancelled_at && at >= from && at < to;
  });
}

function periodHighestShare(
  members: Member[],
  rows: TaskContribution[],
  participants: TaskContributionParticipant[]
): number | null {
  if (members.length < 2 || rows.length < MIN_CONTRIBUTIONS) return null;
  const points = computeContributionMemberPoints(
    members.map((member) => member.id),
    rows,
    participants,
    new Date(0)
  );

  const percentages = computeMemberPercentages(members.map((member) => ({ id: member.id, pts: points.get(member.id) || 0 })));
  return Math.max(...members.map((member) => percentages.get(member.id) || 0));
}

export function computeHouseholdInsights(
  members: Member[],
  contributions: TaskContribution[],
  participants: TaskContributionParticipant[],
  now = new Date()
): HouseholdInsights {
  const end = new Date(startOfLocalDay(now).getTime() + DAY);
  const currentStart = new Date(end.getTime() - 7 * DAY);
  const previousStart = new Date(currentStart.getTime() - 7 * DAY);
  const current = contributionRowsInRange(contributions, currentStart, end);
  const previous = contributionRowsInRange(contributions, previousStart, currentStart);
  const currentHighestShare = periodHighestShare(members, current, participants);
  const previousHighestShare = periodHighestShare(members, previous, participants);
  const enoughCurrentData = current.length >= MIN_CONTRIBUTIONS;
  const enoughComparisonData = enoughCurrentData && previous.length >= MIN_CONTRIBUTIONS;

  let trend: HouseholdTrend = "building";
  if (enoughComparisonData && currentHighestShare !== null && previousHighestShare !== null) {
    const delta = currentHighestShare - previousHighestShare;
    trend = delta <= -5 ? "improving" : delta >= 5 ? "watch" : "stable";
  } else if (enoughCurrentData) {
    trend = "stable";
  }

  return {
    trend,
    currentCount: current.length,
    previousCount: previous.length,
    currentHighestShare,
    previousHighestShare,
    enoughCurrentData,
    enoughComparisonData,
  };
}
