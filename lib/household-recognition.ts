import type { HouseholdInsights } from "@/lib/household-insights";
import type { HouseholdWeeklyReport } from "@/lib/household-weekly-report";

export type HouseholdRecognition = "building" | "improving" | "balanced" | "shared" | "active";

export function computeHouseholdRecognition(
  report: HouseholdWeeklyReport,
  insights: HouseholdInsights
): HouseholdRecognition {
  if (report.confirmedContributions < 4) return "building";
  if (insights.enoughComparisonData && insights.trend === "improving") return "improving";
  if (report.balanceLevel === "healthy") return "balanced";

  const contributingMembers = report.memberShares.filter((member) => member.points > 0).length;
  if (contributingMembers >= 2 && report.balanceLevel !== "marked") return "shared";

  return "active";
}
