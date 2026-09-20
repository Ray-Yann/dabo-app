import type { HouseholdInsights } from "@/lib/household-insights";
import { computeHouseholdBaseState, type HouseholdRecognition } from "@/lib/household-recognition";
import type { HouseholdWeeklyReport } from "@/lib/household-weekly-report";

export type HouseholdIntelligentSummary = "building" | "improving" | "watch" | "balanced" | "shared" | "active";

export function computeHouseholdIntelligentSummary(
  report: HouseholdWeeklyReport,
  insights: HouseholdInsights,
  recognition: HouseholdRecognition
): HouseholdIntelligentSummary {
  const baseState = computeHouseholdBaseState(report, insights);
  if (baseState) return baseState;
  if (insights.enoughComparisonData && insights.trend === "watch") return "watch";
  if (recognition === "balanced") return "balanced";
  if (recognition === "shared") return "shared";
  return "active";
}
