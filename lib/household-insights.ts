import type { Member } from "@/lib/types";
import { DEFAULT_MINIMUM_CONTRIBUTIONS, computeContributionPeriodSnapshot, type TaskContribution, type TaskContributionParticipant } from "@/lib/task-contributions";

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

function startOfLocalDay(value: Date): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
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
  const current = computeContributionPeriodSnapshot({
    memberIds: members.map((member) => member.id),
    contributions,
    participants,
    start: currentStart,
    end,
    minimumContributions: DEFAULT_MINIMUM_CONTRIBUTIONS,
  });
  const previous = computeContributionPeriodSnapshot({
    memberIds: members.map((member) => member.id),
    contributions,
    participants,
    start: previousStart,
    end: currentStart,
    minimumContributions: DEFAULT_MINIMUM_CONTRIBUTIONS,
  });
  const currentHighestShare = current.highestShare;
  const previousHighestShare = previous.highestShare;
  const enoughCurrentData = current.confirmedContributions >= DEFAULT_MINIMUM_CONTRIBUTIONS;
  const enoughComparisonData =
    enoughCurrentData &&
    previous.confirmedContributions >= DEFAULT_MINIMUM_CONTRIBUTIONS;

  let trend: HouseholdTrend = "building";
  if (enoughComparisonData && currentHighestShare !== null && previousHighestShare !== null) {
    const delta = currentHighestShare - previousHighestShare;
    trend = delta <= -5 ? "improving" : delta >= 5 ? "watch" : "stable";
  } else if (enoughCurrentData) {
    trend = "stable";
  }

  return {
    trend,
    currentCount: current.confirmedContributions,
    previousCount: previous.confirmedContributions,
    currentHighestShare,
    previousHighestShare,
    enoughCurrentData,
    enoughComparisonData,
  };
}
