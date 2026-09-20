import type { HouseholdInsights } from "@/lib/household-insights";
import type { HouseholdWeeklyReport } from "@/lib/household-weekly-report";

export type HouseholdRecognition = "building" | "improving" | "balanced" | "shared" | "active";
export type HouseholdBaseState = "building" | "improving" | null;

export function computeHouseholdBaseState(
  report: HouseholdWeeklyReport,
  insights: HouseholdInsights
): HouseholdBaseState {
  if (report.confirmedContributions < 4) return "building";
  if (insights.enoughComparisonData && insights.trend === "improving") return "improving";
  return null;
}

export function computeHouseholdRecognition(
  report: HouseholdWeeklyReport,
  insights: HouseholdInsights
): HouseholdRecognition {
  const baseState = computeHouseholdBaseState(report, insights);
  if (baseState) return baseState;
  if (report.balanceLevel === "healthy") return "balanced";

  const contributingMembers = report.memberShares.filter((member) => member.points > 0).length;
  if (contributingMembers >= 2 && report.balanceLevel !== "marked") return "shared";

  return "active";
}
