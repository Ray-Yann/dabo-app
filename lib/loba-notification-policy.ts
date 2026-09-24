import type { LobaHouseholdAction } from "@/lib/loba-household-actions";

export type LobaNotificationPlanItem =
  | {
      kind: "members";
      targetMemberIds: string[];
      key: "notif_task_assigned" | "notif_item_assigned";
      params: Record<string, string>;
    }
  | {
      kind: "household";
      key: "notif_task_urgent" | "notif_item_urgent";
      params: Record<string, string>;
    }
  | {
      kind: "bill-paid";
      key: "notif_bill_paid";
      resourceId: string;
    };

type Input = {
  action: LobaHouseholdAction;
  actorMemberId: string;
  actorFirstName: string;
};

function previousString(
  expected: Record<string, unknown> | undefined,
  key: string
): string | null | undefined {
  const value = expected?.[key];
  return typeof value === "string" ? value : value === null ? null : undefined;
}

function previousBoolean(
  expected: Record<string, unknown> | undefined,
  key: string
): boolean | undefined {
  const value = expected?.[key];
  return typeof value === "boolean" ? value : undefined;
}

function assignmentPlan(input: {
  previousAssignedTo: string | null | undefined;
  nextAssignedTo: string | null | undefined;
  actorMemberId: string;
  key: "notif_task_assigned" | "notif_item_assigned";
  params: Record<string, string>;
}): LobaNotificationPlanItem[] {
  const {
    previousAssignedTo,
    nextAssignedTo,
    actorMemberId,
    key,
    params,
  } = input;

  if (
    !nextAssignedTo ||
    nextAssignedTo === actorMemberId ||
    nextAssignedTo === previousAssignedTo
  ) {
    return [];
  }

  return [
    {
      kind: "members",
      targetMemberIds: [nextAssignedTo],
      key,
      params,
    },
  ];
}

export function lobaNotificationPlan({
  action,
  actorMemberId,
  actorFirstName,
}: Input): LobaNotificationPlanItem[] {
  if (action.type === "task.add") {
    const plan = assignmentPlan({
      previousAssignedTo: null,
      nextAssignedTo: action.assignedTo,
      actorMemberId,
      key: "notif_task_assigned",
      params: { name: actorFirstName, task: action.name },
    });

    if (action.urgent) {
      plan.push({
        kind: "household",
        key: "notif_task_urgent",
        params: { name: actorFirstName, task: action.name },
      });
    }

    return plan;
  }

  if (action.type === "task.update") {
    const plan: LobaNotificationPlanItem[] = [];
    const previousAssignedTo = previousString(action.expected, "assignedTo");

    if ("assignedTo" in action.changes) {
      plan.push(
        ...assignmentPlan({
          previousAssignedTo,
          nextAssignedTo: action.changes.assignedTo,
          actorMemberId,
          key: "notif_task_assigned",
          params: {
            name: actorFirstName,
            task: action.changes.name ?? action.taskName ?? "Tâche",
          },
        })
      );
    }

    if (
      action.changes.urgent === true &&
      previousBoolean(action.expected, "urgent") === false
    ) {
      plan.push({
        kind: "household",
        key: "notif_task_urgent",
        params: {
          name: actorFirstName,
          task: action.changes.name ?? action.taskName ?? "Tâche",
        },
      });
    }

    return plan;
  }

  if (action.type === "shopping.update") {
    const plan: LobaNotificationPlanItem[] = [];
    const previousAssignedTo = previousString(action.expected, "assignedTo");

    if ("assignedTo" in action.changes) {
      plan.push(
        ...assignmentPlan({
          previousAssignedTo,
          nextAssignedTo: action.changes.assignedTo,
          actorMemberId,
          key: "notif_item_assigned",
          params: {
            name: actorFirstName,
            item: action.changes.name ?? action.itemName ?? "Article",
          },
        })
      );
    }

    if (
      action.changes.urgent === true &&
      previousBoolean(action.expected, "urgent") === false
    ) {
      plan.push({
        kind: "household",
        key: "notif_item_urgent",
        params: {
          name: actorFirstName,
          item: action.changes.name ?? action.itemName ?? "Article",
        },
      });
    }

    return plan;
  }

  if (action.type === "finance.bill.pay") {
    if (action.expected?.visibility === "household") {
      return [
        {
          kind: "bill-paid",
          key: "notif_bill_paid",
          resourceId: action.billId,
        },
      ];
    }

    return [];
  }

  return [];
}
