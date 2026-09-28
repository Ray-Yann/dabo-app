import assert from "node:assert/strict";
import test from "node:test";

import {
  financeBillAttentionCandidates,
  selectHouseholdAttention,
  shoppingHabitAttentionCandidates,
  shoppingSessionAttentionCandidate,
  taskAttentionCandidates,
  type AttentionCandidate,
} from "@/lib/attention-engine";
import { shoppingSessionPromptEligible, type ShoppingFinanceSession } from "@/lib/shopping-finance";
import type { Task } from "@/lib/types";

const NOW = "2026-09-10T10:00:00.000Z";
const HOUSEHOLD = "home-a";

function candidate(overrides: Partial<AttentionCandidate> & Pick<AttentionCandidate, "id" | "level" | "priority">): AttentionCandidate {
  return {
    householdId: HOUSEHOLD,
    source: "tasks",
    type: "test",
    title: overrides.id,
    reason: "test",
    action: "open_tasks",
    dedupeKey: overrides.id,
    visibility: "household",
    ...overrides,
  };
}

function task(overrides: Partial<Task> & Pick<Task, "id" | "name">): Task {
  return {
    household_id: HOUSEHOLD,
    routine_id: null,
    weight_points: 10,
    duration_key: "10min",
    effort_level: "faible",
    assigned_to: null,
    status: "pending",
    urgent: false,
    due_date: null,
    completed_at: null,
    created_at: "2026-09-01T10:00:00.000Z",
    ...overrides,
  };
}

test("Attention Engine sÃ©lectionne au maximum trois Ã©lÃ©ments et respecte les niveaux", () => {
  const selected = selectHouseholdAttention({
    householdId: HOUSEHOLD,
    now: NOW,
    candidates: [
      candidate({ id: "info", level: "information", priority: 999 }),
      candidate({ id: "suggestion", level: "suggestion", priority: 999 }),
      candidate({ id: "anticipate", level: "anticipate", priority: 10 }),
      candidate({ id: "now", level: "action_now", priority: 1 }),
    ],
  });
  assert.deepEqual(selected.map((item) => item.id), ["now", "anticipate", "suggestion"]);
});

test("Attention Engine accepte le silence", () => {
  assert.deepEqual(selectHouseholdAttention({ householdId: HOUSEHOLD, now: NOW, candidates: [] }), []);
});

test("Attention Engine isole strictement le foyer actif", () => {
  const selected = selectHouseholdAttention({
    householdId: HOUSEHOLD,
    now: NOW,
    candidates: [
      candidate({ id: "a", level: "action_now", priority: 10 }),
      candidate({ id: "b", householdId: "home-b", level: "action_now", priority: 1000 }),
    ],
  });
  assert.deepEqual(selected.map((item) => item.id), ["a"]);
});

test("Attention Engine protÃ¨ge une attention privÃ©e", () => {
  const privateItem = candidate({
    id: "private",
    level: "action_now",
    priority: 100,
    visibility: "private",
    privateOwnerId: "ray",
  });
  assert.equal(selectHouseholdAttention({ householdId: HOUSEHOLD, viewerMemberId: "manga", now: NOW, candidates: [privateItem] }).length, 0);
  assert.equal(selectHouseholdAttention({ householdId: HOUSEHOLD, viewerMemberId: "ray", now: NOW, candidates: [privateItem] }).length, 1);
});

test("Attention Engine respecte snooze, rÃ©solution, expiration et dÃ©duplication", () => {
  const selected = selectHouseholdAttention({
    householdId: HOUSEHOLD,
    now: NOW,
    candidates: [
      candidate({ id: "resolved", level: "action_now", priority: 200, state: "resolved" }),
      candidate({ id: "snoozed", level: "action_now", priority: 190, state: "snoozed", snoozedUntil: "2026-09-10T11:00:00.000Z" }),
      candidate({ id: "expired", level: "action_now", priority: 180, expiresAt: "2026-09-10T09:00:00.000Z" }),
      candidate({ id: "first", level: "anticipate", priority: 90, dedupeKey: "same" }),
      candidate({ id: "duplicate", level: "anticipate", priority: 80, dedupeKey: "same" }),
    ],
  });
  assert.deepEqual(selected.map((item) => item.id), ["first"]);
});

test("une facture aujourd'hui passe devant une tÃ¢che Ã  Ã©chÃ©ance aujourd'hui", () => {
  const bills = financeBillAttentionCandidates([{
    id: "bill", label: "Ã‰lectricitÃ©", amount: 64, due_on: "2026-09-10", status: "pending", currency: "EUR",
  }], HOUSEHOLD, "2026-09-10");
  const tasks = taskAttentionCandidates([task({ id: "task", name: "Poubelles", due_date: "2026-09-10" })], HOUSEHOLD, "2026-09-10");
  const selected = selectHouseholdAttention({ householdId: HOUSEHOLD, now: NOW, candidates: [...tasks, ...bills] });
  assert.deepEqual(selected.map((item) => item.source), ["finance", "tasks"]);
});

test("une facture payÃ©e et une tÃ¢che terminÃ©e disparaissent des candidats", () => {
  const bills = financeBillAttentionCandidates([{
    id: "paid", label: "Internet", amount: 50, due_on: "2026-09-10", status: "paid", currency: "EUR",
  }], HOUSEHOLD, "2026-09-10");
  const tasks = taskAttentionCandidates([task({ id: "done", name: "Aspirateur", due_date: "2026-09-09", status: "done" })], HOUSEHOLD, "2026-09-10");
  assert.deepEqual([...bills, ...tasks], []);
});

test("Courses Plus tard ne remonte pas avant la fin du snooze existant", () => {
  const session: ShoppingFinanceSession = {
    id: "session", household_id: HOUSEHOLD, shopper_member_id: "ray",
    first_bought_at: "2026-09-10T08:00:00.000Z", last_bought_at: "2026-09-10T08:30:00.000Z",
    item_count: 4, state: "pending", total_amount: null, finance_transaction_id: null,
    prompted_at: "2026-09-10T09:30:00.000Z",
  };
  const now = new Date(NOW);
  const eligible = shoppingSessionPromptEligible(session, now, 10, 60);
  assert.equal(eligible, false);
  assert.equal(shoppingSessionAttentionCandidate(session, now, eligible), null);
});


test("une habitude Courses predictive devient une suggestion du foyer", () => {
  const candidates = shoppingHabitAttentionCandidates([{
    productKey: "lait",
    label: "Lait",
    purchaseCount: 4,
    intervalsDays: [7, 7, 8],
    rhythmDays: 7,
    consistencyRatio: 0.143,
    lastPurchasedOn: "2026-09-04",
    expectedOn: "2026-09-11",
    suggestFrom: "2026-09-10",
    suggestUntil: "2026-09-14",
    score: 92,
    reason: "recurring_purchase",
  }], HOUSEHOLD);

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].source, "shopping");
  assert.equal(candidates[0].type, "shopping.recurring_purchase");
  assert.equal(candidates[0].level, "suggestion");
  assert.equal(candidates[0].title, "Lait");
  assert.equal(candidates[0].reason, "recurring_purchase");
  assert.equal(candidates[0].action, "open_shopping_suggestions");
  assert.equal(candidates[0].dueAt, "2026-09-11");
  assert.equal(candidates[0].expiresAt, "2026-09-15T00:00:00.000Z");
  assert.equal(candidates[0].dedupeKey, "shopping-habit:lait");
  assert.equal(candidates[0].visibility, "household");
});

