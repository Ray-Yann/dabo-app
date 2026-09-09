export type FinancePeriod = "week" | "month" | "quarter" | "semester" | "year";

export type FinanceTransactionLike = {
  id?: string;
  amount: number;
  occurred_on: string;
  category: string;
  status?: "posted" | "void";
  bill_id?: string | null;
};

export type FinanceBillLike = {
  id?: string;
  amount: number | null;
  due_on: string;
  status: "pending" | "paid" | "cancelled";
  paid_transaction_id?: string | null;
};

function validDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function normalizeMoney(value: number): number {
  if (!Number.isFinite(value) || value < 0) throw new Error("Montant financier invalide");
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function financePeriodRange(period: FinancePeriod, now = new Date()): { start: string; endExclusive: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = new Date(y, m, now.getDate());
  let start: Date;
  let end: Date;

  if (period === "week") {
    const mondayOffset = (d.getDay() + 6) % 7;
    start = new Date(y, m, d.getDate() - mondayOffset);
    end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
  } else if (period === "month") {
    start = new Date(y, m, 1);
    end = new Date(y, m + 1, 1);
  } else if (period === "quarter") {
    const qm = Math.floor(m / 3) * 3;
    start = new Date(y, qm, 1);
    end = new Date(y, qm + 3, 1);
  } else if (period === "semester") {
    const sm = m < 6 ? 0 : 6;
    start = new Date(y, sm, 1);
    end = new Date(y, sm + 6, 1);
  } else {
    start = new Date(y, 0, 1);
    end = new Date(y + 1, 0, 1);
  }

  const key = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { start: key(start), endExclusive: key(end) };
}

export function sumPostedTransactions(transactions: FinanceTransactionLike[], start: string, endExclusive: string): number {
  if (!validDateKey(start) || !validDateKey(endExclusive)) throw new Error("Période invalide");
  return normalizeMoney(transactions
    .filter((t) => (t.status ?? "posted") === "posted" && t.occurred_on >= start && t.occurred_on < endExclusive)
    .reduce((sum, t) => sum + normalizeMoney(t.amount), 0));
}

export function sumPendingBills(bills: FinanceBillLike[], start: string, endExclusive: string): number {
  return normalizeMoney(bills
    .filter((bill) => bill.status === "pending" && bill.due_on >= start && bill.due_on < endExclusive)
    .reduce((sum, bill) => sum + normalizeMoney(bill.amount ?? 0), 0));
}

export function categoryTotals(transactions: FinanceTransactionLike[], start: string, endExclusive: string): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const transaction of transactions) {
    if ((transaction.status ?? "posted") !== "posted" || transaction.occurred_on < start || transaction.occurred_on >= endExclusive) continue;
    totals[transaction.category] = normalizeMoney((totals[transaction.category] ?? 0) + transaction.amount);
  }
  return totals;
}

export function previousPeriodRange(period: FinancePeriod, now = new Date()): { start: string; endExclusive: string } {
  const current = financePeriodRange(period, now);
  const currentStart = new Date(`${current.start}T12:00:00`);
  let previousAnchor: Date;
  if (period === "week") previousAnchor = new Date(currentStart.getFullYear(), currentStart.getMonth(), currentStart.getDate() - 1);
  else if (period === "month") previousAnchor = new Date(currentStart.getFullYear(), currentStart.getMonth(), 0);
  else if (period === "quarter") previousAnchor = new Date(currentStart.getFullYear(), currentStart.getMonth() - 1, 1);
  else if (period === "semester") previousAnchor = new Date(currentStart.getFullYear(), currentStart.getMonth() - 1, 1);
  else previousAnchor = new Date(currentStart.getFullYear() - 1, 6, 1);
  return financePeriodRange(period, previousAnchor);
}

export function percentageChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function shoppingSessionReady(lastBoughtAt: string, now = new Date(), quietMinutes = 10): boolean {
  const last = new Date(lastBoughtAt).getTime();
  if (!Number.isFinite(last)) return false;
  return now.getTime() - last >= quietMinutes * 60_000;
}
