import type { DaboInsight } from "@/lib/dabo-engine";
import type { FinanceBillAttentionLike } from "@/lib/finance-engine";
import type { ShoppingFinanceSession } from "@/lib/shopping-finance";
import type { ShoppingItem, Task } from "@/lib/types";

export type AttentionLevel = "action_now" | "anticipate" | "suggestion" | "information";
export type AttentionVisibility = "household" | "private";
export type AttentionState = "active" | "snoozed" | "resolved" | "expired";
export type AttentionSource = "tasks" | "calendar" | "finance" | "shopping" | "balance";

export type AttentionCandidate = {
  id: string;
  householdId: string;
  source: AttentionSource;
  type: string;
  level: AttentionLevel;
  priority: number;
  title: string;
  reason: string;
  action: string;
  relatedEntityId?: string;
  dueAt?: string | null;
  dedupeKey: string;
  visibility: AttentionVisibility;
  privateOwnerId?: string | null;
  state?: AttentionState;
  snoozedUntil?: string | null;
  expiresAt?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
};

export type AttentionSelectionInput = {
  candidates: AttentionCandidate[];
  householdId: string;
  viewerMemberId?: string | null;
  now: string;
  limit?: number;
};

export const ATTENTION_RULES = {
  maxPrimaryItems: 3,
  upcomingBillDays: 3,
} as const;

const LEVEL_WEIGHT: Record<AttentionLevel, number> = {
  action_now: 4,
  anticipate: 3,
  suggestion: 2,
  information: 1,
};

function parseInstant(value: string): number {
  const instant = new Date(value).getTime();
  if (!Number.isFinite(instant)) throw new Error(`Invalid attention instant: ${value}`);
  return instant;
}

function isVisible(candidate: AttentionCandidate, viewerMemberId?: string | null): boolean {
  if (candidate.visibility === "household") return true;
  return Boolean(viewerMemberId && candidate.privateOwnerId === viewerMemberId);
}

function isEligible(candidate: AttentionCandidate, nowMs: number): boolean {
  const state = candidate.state ?? "active";
  if (state === "resolved" || state === "expired") return false;
  if (candidate.expiresAt && parseInstant(candidate.expiresAt) <= nowMs) return false;
  if (state === "snoozed") {
    if (!candidate.snoozedUntil) return false;
    return parseInstant(candidate.snoozedUntil) <= nowMs;
  }
  if (candidate.snoozedUntil && parseInstant(candidate.snoozedUntil) > nowMs) return false;
  return true;
}

function compareAttention(a: AttentionCandidate, b: AttentionCandidate): number {
  return LEVEL_WEIGHT[b.level] - LEVEL_WEIGHT[a.level]
    || b.priority - a.priority
    || (a.dueAt ?? "9999-12-31").localeCompare(b.dueAt ?? "9999-12-31")
    || a.id.localeCompare(b.id);
}

/**
 * Pure household attention policy. It never writes, notifies or calls AI.
 * Silence ([]) is a valid and intentional result.
 */
export function selectHouseholdAttention(input: AttentionSelectionInput): AttentionCandidate[] {
  const nowMs = parseInstant(input.now);
  const limit = Math.max(0, Math.min(input.limit ?? ATTENTION_RULES.maxPrimaryItems, ATTENTION_RULES.maxPrimaryItems));
  const seen = new Set<string>();

  return input.candidates
    .filter((candidate) => candidate.householdId === input.householdId)
    .filter((candidate) => isVisible(candidate, input.viewerMemberId))
    .filter((candidate) => isEligible(candidate, nowMs))
    .sort(compareAttention)
    .filter((candidate) => {
      if (seen.has(candidate.dedupeKey)) return false;
      seen.add(candidate.dedupeKey);
      return true;
    })
    .slice(0, limit);
}

function civilDiffDays(from: string, to: string): number {
  const start = new Date(`${from}T12:00:00Z`).getTime();
  const end = new Date(`${to}T12:00:00Z`).getTime();
  return Math.round((end - start) / 86_400_000);
}

export function taskAttentionCandidates(tasks: Task[], householdId: string, today: string): AttentionCandidate[] {
  return tasks.flatMap((task) => {
    if (task.household_id !== householdId || task.status !== "pending") return [];
    const days = task.due_date ? civilDiffDays(today, task.due_date) : null;
    if (!task.urgent && (days === null || days > 0)) return [];
    const overdue = days !== null && days < 0;
    return [{
      id: `task:${task.id}`,
      householdId,
      source: "tasks" as const,
      type: overdue ? "task.overdue" : "task.attention",
      level: overdue || task.urgent ? "action_now" as const : "anticipate" as const,
      priority: overdue ? 100 + Math.min(Math.abs(days ?? 0), 30) : task.urgent ? 95 : 85,
      title: task.name,
      reason: overdue ? "overdue" : task.urgent ? "urgent" : "due_today",
      action: "open_tasks",
      relatedEntityId: task.id,
      dueAt: task.due_date,
      dedupeKey: `task:${task.id}`,
      visibility: "household" as const,
      metadata: { urgent: task.urgent, daysFromToday: days },
    }];
  });
}

export function shoppingItemAttentionCandidates(items: ShoppingItem[], householdId: string, today: string): AttentionCandidate[] {
  return items.flatMap((item) => {
    if (item.household_id !== householdId || item.status !== "to_buy") return [];
    const days = item.due_date ? civilDiffDays(today, item.due_date) : null;
    if (!item.urgent && (days === null || days > 0)) return [];
    const overdue = days !== null && days < 0;
    return [{
      id: `shopping-item:${item.id}`,
      householdId,
      source: "shopping" as const,
      type: "shopping.item_attention",
      level: "action_now" as const,
      priority: overdue ? 96 : item.urgent ? 92 : 82,
      title: item.name,
      reason: overdue ? "overdue" : item.urgent ? "urgent" : "due_today",
      action: "open_shopping",
      relatedEntityId: item.id,
      dueAt: item.due_date,
      dedupeKey: `shopping-item:${item.id}`,
      visibility: "household" as const,
    }];
  });
}

export function financeBillAttentionCandidates(bills: FinanceBillAttentionLike[], householdId: string, today: string): AttentionCandidate[] {
  return bills.flatMap((bill) => {
    if (bill.status !== "pending") return [];
    const days = civilDiffDays(today, bill.due_on);
    if (days > ATTENTION_RULES.upcomingBillDays) return [];
    const overdueOrToday = days <= 0;
    return [{
      id: `finance-bill:${bill.id ?? `${bill.label}:${bill.due_on}`}`,
      householdId,
      source: "finance" as const,
      type: days < 0 ? "finance.bill_overdue" : "finance.bill_due",
      level: overdueOrToday ? "action_now" as const : "anticipate" as const,
      priority: days < 0 ? 120 + Math.min(Math.abs(days), 30) : days === 0 ? 115 : 90 - days,
      title: bill.label,
      reason: days < 0 ? "overdue" : days === 0 ? "due_today" : "due_soon",
      action: "open_budget",
      relatedEntityId: bill.id,
      dueAt: bill.due_on,
      dedupeKey: `finance-bill:${bill.id ?? `${bill.label}:${bill.due_on}`}`,
      visibility: "household" as const,
      metadata: { amount: bill.amount, currency: bill.currency ?? "EUR", daysFromToday: days },
    }];
  });
}

export function shoppingSessionAttentionCandidate(
  session: ShoppingFinanceSession,
  now: Date,
  eligible: boolean,
): AttentionCandidate | null {
  if (!eligible || session.state !== "pending" || session.finance_transaction_id) return null;
  return {
    id: `shopping-finance:${session.id}`,
    householdId: session.household_id,
    source: "shopping",
    type: "shopping.finance_pending",
    level: "suggestion",
    priority: 70,
    title: "shopping_finance_pending",
    reason: "shopping_completed_amount_missing",
    action: "complete_shopping_expense",
    relatedEntityId: session.id,
    dedupeKey: `shopping-finance:${session.id}`,
    visibility: "household",
    state: "active",
    metadata: { itemCount: session.item_count, evaluatedAt: now.toISOString() },
  };
}

/** Converts existing deterministic DABO insights without asking AI to reprioritize them. */
export function daboInsightAttentionCandidates(insights: DaboInsight[], householdId: string): AttentionCandidate[] {
  return insights.flatMap((insight) => {
    if (insight.type === "overdue_task") return []; // task adapter is the single source for task urgency.
    const source: AttentionSource = insight.type === "upcoming_event" ? "calendar" : insight.type === "balance" ? "balance" : "tasks";
    const level: AttentionLevel = insight.type === "upcoming_event"
      ? ((Number(insight.metadata?.daysAway ?? 99) <= 1) ? "anticipate" : "information")
      : "suggestion";
    return [{
      id: `insight:${insight.id}`,
      householdId,
      source,
      type: `dabo.${insight.type}`,
      level,
      priority: insight.priority,
      title: insight.titleKey,
      reason: insight.reasonKey,
      action: insight.type === "upcoming_event" ? "open_calendar" : insight.type === "balance" ? "open_balance" : "open_tasks",
      relatedEntityId: insight.relatedEntityId,
      dueAt: typeof insight.metadata?.eventDate === "string" ? insight.metadata.eventDate : null,
      dedupeKey: `${insight.type}:${insight.relatedEntityId ?? insight.id}`,
      visibility: "household",
      metadata: insight.metadata,
    }];
  });
}
