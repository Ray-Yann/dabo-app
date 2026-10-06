import type { HouseholdInsights } from "@/lib/household-insights";
import type { HouseholdWeeklyReport } from "@/lib/household-weekly-report";
import type { FullLoadMap } from "@/lib/full-load-map";
import type { PerceptionGap } from "@/lib/perception-gap";

export type HouseholdInsightConfidence = "insufficient" | "observed" | "robust";
export type HouseholdInsightState = "building" | "steady" | "improving" | "watch";
export type HouseholdAttention = "none" | "review_distribution" | "review_overdue";

export type HouseholdInsightEngineResult = {
  confidence: HouseholdInsightConfidence;
  state: HouseholdInsightState;
  attention: HouseholdAttention;
  canCompare: boolean;
  hasCounterSignal: boolean;
  evidence: {
    confirmedContributions: number;
    currentHighestShare: number | null;
    previousHighestShare: number | null;
    overduePoints: number;
  };
};

/**
 * Turns existing deterministic household signals into one conservative reading.
 * This layer never infers motives, wellbeing or causality. When evidence is weak
 * or contradictory, it deliberately downgrades the conclusion instead of
 * manufacturing certainty.
 */
export function computeHouseholdInsightEngine(input: {
  report: HouseholdWeeklyReport;
  insights: HouseholdInsights;
  fullLoadMap: FullLoadMap;
  perceptionGap?: PerceptionGap;
}): HouseholdInsightEngineResult {
  const { report, insights, fullLoadMap } = input;
  const confidence: HouseholdInsightConfidence = !insights.enoughCurrentData
    ? "insufficient"
    : insights.enoughComparisonData
      ? "robust"
      : "observed";

  const hasCounterSignal =
    input.perceptionGap === "perceives_more_balanced" ||
    input.perceptionGap === "different";

  let state: HouseholdInsightState = "building";
  if (confidence !== "insufficient") {
    if (insights.enoughComparisonData && insights.trend === "improving") {
      state = "improving";
    } else if (
      insights.enoughComparisonData &&
      insights.trend === "watch" &&
      !hasCounterSignal
    ) {
      state = "watch";
    } else {
      state = "steady";
    }
  }

  let attention: HouseholdAttention = "none";
  if (confidence !== "insufficient" && fullLoadMap.overduePoints > 0) {
    attention = "review_overdue";
  } else if (
    confidence === "robust" &&
    report.suggestion === "rebalance" &&
    !hasCounterSignal
  ) {
    attention = "review_distribution";
  }

  return {
    confidence,
    state,
    attention,
    canCompare: insights.enoughComparisonData,
    hasCounterSignal,
    evidence: {
      confirmedContributions: report.confirmedContributions,
      currentHighestShare: insights.currentHighestShare,
      previousHighestShare: insights.previousHighestShare,
      overduePoints: fullLoadMap.overduePoints,
    },
  };
}
