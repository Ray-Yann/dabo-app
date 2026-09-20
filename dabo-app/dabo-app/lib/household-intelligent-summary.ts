import type { HouseholdInsights } from "@/lib/household-insights";
import type { HouseholdRecognition } from "@/lib/household-recognition";
import type { HouseholdWeeklyReport } from "@/lib/household-weekly-report";

export type HouseholdIntelligentSummary = "building" | "improving" | "watch" | "balanced" | "shared" | "active";

export function computeHouseholdIntelligentSummary(
  report: HouseholdWeeklyReport,
  insights: HouseholdInsights,
  recognition: HouseholdRecognition
): HouseholdIntelligentSummary {
  if (report.confirmedContributions < 4) return "building";
  if (insights.enoughComparisonData && insights.trend === "improving") return "improving";
  if (insights.enoughComparisonData && insights.trend === "watch") return "watch";
  if (recognition === "balanced") return "balanced";
  if (recognition === "shared") return "shared";
  return "active";
}
