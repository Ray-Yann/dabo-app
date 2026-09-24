import test from "node:test";
import assert from "node:assert/strict";
import { lobaNotificationPlan } from "../lib/loba-notification-policy";

const actor = { id: "actor", firstName: "Ray-Yann" };

test("LOBA task.add notifies the assignee and household when created urgent", () => {
  const plan = lobaNotificationPlan({
    action: {
      type: "task.add",
      name: "Sortir les poubelles",
      dueDate: null,
      assignedTo: "member-2",
      urgent: true,
      durationKey: "10min",
      effortLevel: "faible",
    },
    actorMemberId: actor.id,
    actorFirstName: actor.firstName,
  });

  assert.deepEqual(plan, [
    {
      kind: "members",
      targetMemberIds: ["member-2"],
      key: "notif_task_assigned",
      params: { name: "Ray-Yann", task: "Sortir les poubelles" },
    },
    {
      kind: "household",
      key: "notif_task_urgent",
      params: { name: "Ray-Yann", task: "Sortir les poubelles" },
    },
  ]);
});

test("LOBA task.update only notifies a newly assigned member and a new urgent transition", () => {
  const plan = lobaNotificationPlan({
    action: {
      type: "task.update",
      taskId: "task-1",
      taskName: "Vaisselle",
      expected: { assignedTo: "member-2", urgent: false },
      changes: { assignedTo: "member-3", urgent: true },
    },
    actorMemberId: actor.id,
    actorFirstName: actor.firstName,
  });

  assert.deepEqual(plan, [
    {
      kind: "members",
      targetMemberIds: ["member-3"],
      key: "notif_task_assigned",
      params: { name: "Ray-Yann", task: "Vaisselle" },
    },
    {
      kind: "household",
      key: "notif_task_urgent",
      params: { name: "Ray-Yann", task: "Vaisselle" },
    },
  ]);
});

test("LOBA does not notify unchanged task assignment or already urgent task", () => {
  const plan = lobaNotificationPlan({
    action: {
      type: "task.update",
      taskId: "task-1",
      taskName: "Vaisselle",
      expected: { assignedTo: "member-2", urgent: true },
      changes: { assignedTo: "member-2", urgent: true },
    },
    actorMemberId: actor.id,
    actorFirstName: actor.firstName,
  });

  assert.deepEqual(plan, []);
});

test("LOBA shopping.update mirrors assignment and urgent notification semantics", () => {
  const plan = lobaNotificationPlan({
    action: {
      type: "shopping.update",
      itemId: "item-1",
      itemName: "Lait",
      expected: { assignedTo: null, urgent: false },
      changes: { assignedTo: "member-2", urgent: true },
    },
    actorMemberId: actor.id,
    actorFirstName: actor.firstName,
  });

  assert.deepEqual(plan, [
    {
      kind: "members",
      targetMemberIds: ["member-2"],
      key: "notif_item_assigned",
      params: { name: "Ray-Yann", item: "Lait" },
    },
    {
      kind: "household",
      key: "notif_item_urgent",
      params: { name: "Ray-Yann", item: "Lait" },
    },
  ]);
});

test("LOBA never sends an assignment notification back to the actor", () => {
  const plan = lobaNotificationPlan({
    action: {
      type: "task.add",
      name: "Cuisine",
      dueDate: null,
      assignedTo: "actor",
      urgent: false,
      durationKey: "30min",
      effortLevel: "moyen",
    },
    actorMemberId: actor.id,
    actorFirstName: actor.firstName,
  });

  assert.deepEqual(plan, []);
});

test("LOBA shared bill payment uses the secured bill resource contract", () => {
  const plan = lobaNotificationPlan({
    action: {
      type: "finance.bill.pay",
      billId: "bill-1",
      paidBy: "member-2",
      paidOn: "2026-09-24",
      expected: { visibility: "household" },
    },
    actorMemberId: actor.id,
    actorFirstName: actor.firstName,
  });

  assert.deepEqual(plan, [
    {
      kind: "bill-paid",
      key: "notif_bill_paid",
      resourceId: "bill-1",
    },
  ]);
});

test("LOBA private bill payment remains silent", () => {
  const plan = lobaNotificationPlan({
    action: {
      type: "finance.bill.pay",
      billId: "bill-private",
      paidBy: "actor",
      paidOn: "2026-09-24",
      billLabel: "Facture privee",
      expected: { visibility: "private" },
    },
    actorMemberId: actor.id,
    actorFirstName: actor.firstName,
  });

  assert.deepEqual(plan, []);
});

test("LOBA ordinary, destructive and personal actions remain silent", () => {
  const actions = [
    {
      type: "finance.expense.add",
      label: "Essence",
      amount: 40,
      category: "transport",
      occurredOn: "2026-09-24",
      paidBy: "actor",
    },
    {
      type: "finance.bill.add",
      label: "Internet",
      amount: 50,
      category: "abonnements",
      dueOn: "2026-09-30",
    },
    {
      type: "calendar.add",
      title: "Dentiste",
      eventDate: "2026-10-01",
      visibility: "personal",
      recurring: false,
    },
  ] as const;

  for (const action of actions) {
    assert.deepEqual(
      lobaNotificationPlan({
        action,
        actorMemberId: actor.id,
        actorFirstName: actor.firstName,
      }),
      []
    );
  }
});
