import type { CalendarEvent, Member, ShoppingItem } from "@/lib/types";
import type { TaskContribution, TaskContributionParticipant } from "@/lib/task-contributions";
import { computeMemberPercentages } from "@/lib/utils";

export type WeeklyBalanceLevel = "building" | "healthy" | "gentle" | "marked";
export type WeeklyMemberShare = { memberId: string; firstName: string; points: number; percentage: number };
export type HouseholdWeeklyReport = {
  start: Date; end: Date; confirmedContributions: number; boughtItems: number; householdEvents: number;
  totalPoints: number; memberShares: WeeklyMemberShare[]; highestShare: number | null; balanceLevel: WeeklyBalanceLevel;
  celebration: "building" | "active" | "balanced"; suggestion: "none" | "rebalance";
};
const DAY = 86_400_000;
const MIN_CONTRIBUTIONS = 4;
function startOfLocalDay(value: Date) { const d = new Date(value); d.setHours(0,0,0,0); return d; }
function inRange(value: string | null | undefined, start: Date, end: Date) { if (!value) return false; const ms = new Date(value).getTime(); return ms >= start.getTime() && ms < end.getTime(); }

export function computeHouseholdWeeklyReport(input: {
  members: Member[]; contributions: TaskContribution[]; participants: TaskContributionParticipant[];
  shoppingItems?: ShoppingItem[]; calendarEvents?: CalendarEvent[]; now?: Date;
}): HouseholdWeeklyReport {
  const now = input.now ?? new Date();
  const end = new Date(startOfLocalDay(now).getTime() + DAY);
  const start = new Date(end.getTime() - 7 * DAY);
  const activeIds = new Set(input.members.map(m => m.id));
  const rows = input.contributions.filter(r => r.performer_status === "confirmed" && !r.cancelled_at && inRange(r.completed_at, start, end));
  const participantMap = new Map<string, TaskContributionParticipant[]>();
  input.participants.forEach(p => { if (!activeIds.has(p.member_id)) return; const list = participantMap.get(p.contribution_id) || []; list.push(p); participantMap.set(p.contribution_id, list); });
  const points = new Map(input.members.map(m => [m.id, 0]));
  let confirmedContributions = 0;
  rows.forEach(row => { const ps = participantMap.get(row.id) || []; if (!ps.length) return; confirmedContributions += 1; const share = row.weight_points / ps.length; ps.forEach(p => points.set(p.member_id, (points.get(p.member_id) || 0) + share)); });
  const percentages = computeMemberPercentages(input.members.map(m => ({ id: m.id, pts: points.get(m.id) || 0 })));
  const memberShares = input.members.map(m => ({ memberId: m.id, firstName: m.first_name, points: points.get(m.id) || 0, percentage: percentages.get(m.id) || 0 }));
  const highestShare = input.members.length >= 2 && confirmedContributions >= MIN_CONTRIBUTIONS ? Math.max(...memberShares.map(m => m.percentage)) : null;
  const ideal = input.members.length ? 100 / input.members.length : 100;
  let balanceLevel: WeeklyBalanceLevel = "building";
  if (highestShare !== null) balanceLevel = input.members.length === 2 ? (highestShare < 60 ? "healthy" : highestShare < 70 ? "gentle" : "marked") : (highestShare <= ideal * 1.2 ? "healthy" : highestShare <= ideal * 1.5 ? "gentle" : "marked");
  return {
    start, end, confirmedContributions,
    boughtItems: (input.shoppingItems || []).filter(i => i.status === "bought" && inRange(i.bought_at, start, end)).length,
    householdEvents: (input.calendarEvents || []).filter(e => e.visibility === "household" && inRange(e.event_date, start, end)).length,
    totalPoints: memberShares.reduce((sum,m) => sum + m.points, 0), memberShares, highestShare, balanceLevel,
    celebration: confirmedContributions < MIN_CONTRIBUTIONS ? "building" : balanceLevel === "healthy" ? "balanced" : "active",
    suggestion: balanceLevel === "gentle" || balanceLevel === "marked" ? "rebalance" : "none",
  };
}
