import { shoppingSessionReady } from "@/lib/finance-engine";

export type ShoppingFinanceSession = {
  id: string;
  household_id: string;
  shopper_member_id: string | null;
  first_bought_at: string;
  last_bought_at: string;
  item_count: number;
  state: "pending" | "recorded" | "dismissed";
  total_amount: number | null;
  finance_transaction_id: string | null;
  prompted_at: string | null;
};

export function shoppingSessionPromptEligible(
  session: ShoppingFinanceSession,
  now = new Date(),
  quietMinutes = 10,
  snoozeMinutes = 60,
): boolean {
  if (session.state !== "pending" || session.finance_transaction_id) return false;
  if (!shoppingSessionReady(session.last_bought_at, now, quietMinutes)) return false;
  if (!session.prompted_at) return true;
  const promptedAt = new Date(session.prompted_at).getTime();
  if (!Number.isFinite(promptedAt)) return true;
  return now.getTime() - promptedAt >= snoozeMinutes * 60_000;
}
