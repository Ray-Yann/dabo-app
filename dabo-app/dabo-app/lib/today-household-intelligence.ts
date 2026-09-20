import type { AttentionCandidate } from "@/lib/attention-engine";
import type { HouseholdInsights } from "@/lib/household-insights";

/**
 * Turns the weekly household reading into at most one calm Today signal.
 * A healthy, improving or still-building household stays silent here: the
 * weekly Bilan remains the place for the full interpretation.
 */
export function buildTodayHouseholdIntelligenceCandidate(input: {
  householdId: string;
  insights: HouseholdInsights;
}): AttentionCandidate | null {
  const { householdId, insights } = input;
  if (!insights.enoughComparisonData || insights.trend !== "watch") return null;

  return {
    id: "household-intelligence:weekly-watch",
    householdId,
    source: "balance",
    type: "household.weekly_watch",
    level: "suggestion",
    priority: 65,
    title: "today_household_intelligence_title",
    reason: "today_household_intelligence_text",
    action: "open_weekly_report",
    dedupeKey: "household-intelligence:weekly",
    visibility: "household",
    metadata: {
      currentCount: insights.currentCount,
      previousCount: insights.previousCount,
      currentHighestShare: insights.currentHighestShare,
      previousHighestShare: insights.previousHighestShare,
    },
  };
}
