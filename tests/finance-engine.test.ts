import test from "node:test";
import assert from "node:assert/strict";
import { shoppingSessionPromptEligible } from "@/lib/shopping-finance";
import {
  categoryTotals,
  financePeriodLabel,
  financePeriodRange,
  percentageChange,
  previousPeriodRange,
  shiftFinancePeriodAnchor,
  shoppingSessionReady,
  sumPendingBills,
  sumPostedTransactions,
} from "@/lib/finance-engine";

test("Finance calcule semaine, mois, trimestre, semestre et année", () => {
  const now = new Date(2026, 8, 9, 12, 0, 0);
  assert.deepEqual(financePeriodRange("week", now), { start: "2026-09-07", endExclusive: "2026-09-14" });
  assert.deepEqual(financePeriodRange("month", now), { start: "2026-09-01", endExclusive: "2026-10-01" });
  assert.deepEqual(financePeriodRange("quarter", now), { start: "2026-07-01", endExclusive: "2026-10-01" });
  assert.deepEqual(financePeriodRange("semester", now), { start: "2026-07-01", endExclusive: "2027-01-01" });
  assert.deepEqual(financePeriodRange("year", now), { start: "2026-01-01", endExclusive: "2027-01-01" });
});

test("Finance additionne uniquement les dépenses postées de la période", () => {
  const rows = [
    { amount: 64.3, occurred_on: "2026-09-09", category: "courses" },
    { amount: 20, occurred_on: "2026-09-10", category: "transport" },
    { amount: 9, occurred_on: "2026-08-31", category: "courses" },
    { amount: 99, occurred_on: "2026-09-11", category: "autre", status: "void" as const },
  ];
  assert.equal(sumPostedTransactions(rows, "2026-09-01", "2026-10-01"), 84.3);
  assert.deepEqual(categoryTotals(rows, "2026-09-01", "2026-10-01"), { courses: 64.3, transport: 20 });
});

test("Finance ne compte dans à payer que les factures encore ouvertes", () => {
  const bills = [
    { amount: 49, due_on: "2026-09-15", status: "pending" as const },
    { amount: 94.2, due_on: "2026-09-18", status: "paid" as const },
    { amount: 32, due_on: "2026-10-02", status: "pending" as const },
  ];
  assert.equal(sumPendingBills(bills, "2026-09-01", "2026-10-01"), 49);
});

test("Finance compare une période à la précédente sans inventer de pourcentage sur base zéro", () => {
  const previous = previousPeriodRange("month", new Date(2026, 8, 9));
  assert.deepEqual(previous, { start: "2026-08-01", endExclusive: "2026-09-01" });
  assert.equal(percentageChange(114, 100), 14);
  assert.equal(percentageChange(10, 0), null);
  assert.equal(percentageChange(0, 0), 0);
});

test("Une session Courses devient éligible après 10 minutes de calme", () => {
  const now = new Date("2026-09-09T14:20:00Z");
  assert.equal(shoppingSessionReady("2026-09-09T14:09:59Z", now), true);
  assert.equal(shoppingSessionReady("2026-09-09T14:15:00Z", now), false);
});


test("Finance navigue entre les périodes sans dépendre de la date du jour", () => {
  const anchor = new Date(2026, 8, 9);
  assert.equal(financePeriodLabel("month", shiftFinancePeriodAnchor("month", anchor, 1)), "Octobre 2026");
  assert.equal(financePeriodLabel("year", shiftFinancePeriodAnchor("year", anchor, 1)), "2027");
  assert.equal(financePeriodLabel("quarter", shiftFinancePeriodAnchor("quarter", anchor, -1)), "T2 2026");
});

test("Finance conserve une plage cohérente quand on navigue vers 2027", () => {
  const nextYear = shiftFinancePeriodAnchor("year", new Date(2026, 8, 9), 1);
  assert.deepEqual(financePeriodRange("year", nextYear), { start: "2027-01-01", endExclusive: "2028-01-01" });
});


test("Courses → Finance propose la session après 10 minutes et respecte Plus tard", () => {
  const session = {
    id: "s1", household_id: "h1", shopper_member_id: "m1",
    first_bought_at: "2026-09-09T14:00:00Z", last_bought_at: "2026-09-09T14:05:00Z",
    item_count: 4, state: "pending" as const, total_amount: null, finance_transaction_id: null, prompted_at: null,
  };
  assert.equal(shoppingSessionPromptEligible(session, new Date("2026-09-09T14:14:59Z")), false);
  assert.equal(shoppingSessionPromptEligible(session, new Date("2026-09-09T14:15:00Z")), true);
  assert.equal(shoppingSessionPromptEligible({ ...session, prompted_at: "2026-09-09T14:15:00Z" }, new Date("2026-09-09T14:30:00Z")), false);
  assert.equal(shoppingSessionPromptEligible({ ...session, prompted_at: "2026-09-09T14:15:00Z" }, new Date("2026-09-09T15:15:00Z")), true);
});

test("Courses → Finance ne repropose jamais une session enregistrée ou ignorée", () => {
  const base = {
    id: "s1", household_id: "h1", shopper_member_id: "m1",
    first_bought_at: "2026-09-09T14:00:00Z", last_bought_at: "2026-09-09T14:05:00Z",
    item_count: 2, total_amount: null, finance_transaction_id: null, prompted_at: null,
  };
  assert.equal(shoppingSessionPromptEligible({ ...base, state: "dismissed" as const }, new Date("2026-09-09T16:00:00Z")), false);
  assert.equal(shoppingSessionPromptEligible({ ...base, state: "recorded" as const, finance_transaction_id: "tx1" }, new Date("2026-09-09T16:00:00Z")), false);
});
