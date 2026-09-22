export type HouseholdMemoryType =
  | "accepted_routine_adaptation"
  | "accepted_rebalance";

export type RoutineAdaptationMemorySource = {
  id: string;
  household_id: string;
  routine_id: string;
  suggested_frequency: string;
  suggested_custom_days: number[] | null;
  suggested_anchor_weekday: number | null;
  status: "pending" | "accepted" | "dismissed" | "snoozed";
  suggested_at: string;
  responded_at: string | null;
};

export type AcceptedRebalanceMemorySource = {
  id: string;
  household_id: string;
  task_id: string;
  suggested_member_id: string;
  previous_assigned_to: string | null;
  reason: "rebalance";
  accepted_at: string;
};

export type HouseholdMemory =
  | {
      id: string;
      householdId: string;
      type: "accepted_routine_adaptation";
      occurredAt: string;
      sourceType: "routine_adaptation_preference";
      sourceId: string;
      routineId: string;
      suggestedFrequency: string;
      suggestedCustomDays: number[] | null;
      suggestedAnchorWeekday: number | null;
    }
  | {
      id: string;
      householdId: string;
      type: "accepted_rebalance";
      occurredAt: string;
      sourceType: "household_action_suggestion";
      sourceId: string;
      taskId: string;
      suggestedMemberId: string;
      previousAssignedTo: string | null;
    };

export function buildHouseholdMemory(input: {
  householdId: string;
  routineAdaptations: RoutineAdaptationMemorySource[];
  acceptedRebalances: AcceptedRebalanceMemorySource[];
}): HouseholdMemory[] {
  const memories: HouseholdMemory[] = [];

  for (const preference of input.routineAdaptations) {
    if (
      preference.household_id !== input.householdId ||
      preference.status !== "accepted"
    ) {
      continue;
    }

    const occurredAt = preference.responded_at ?? preference.suggested_at;

    memories.push({
      id: `routine_adaptation_preference:${preference.id}`,
      householdId: input.householdId,
      type: "accepted_routine_adaptation",
      occurredAt,
      sourceType: "routine_adaptation_preference",
      sourceId: preference.id,
      routineId: preference.routine_id,
      suggestedFrequency: preference.suggested_frequency,
      suggestedCustomDays: preference.suggested_custom_days
        ? [...preference.suggested_custom_days]
        : null,
      suggestedAnchorWeekday: preference.suggested_anchor_weekday,
    });
  }

  for (const action of input.acceptedRebalances) {
    if (
      action.household_id !== input.householdId ||
      action.reason !== "rebalance"
    ) {
      continue;
    }

    memories.push({
      id: `household_action_suggestion:${action.id}`,
      householdId: input.householdId,
      type: "accepted_rebalance",
      occurredAt: action.accepted_at,
      sourceType: "household_action_suggestion",
      sourceId: action.id,
      taskId: action.task_id,
      suggestedMemberId: action.suggested_member_id,
      previousAssignedTo: action.previous_assigned_to,
    });
  }

  return memories.sort((a, b) => {
    const byDate = b.occurredAt.localeCompare(a.occurredAt);
    return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
  });
}


export type HouseholdMemoryPresentation = {
  memoryId: string;
  type: HouseholdMemoryType;
  occurredAt: string;
  subjectName: string | null;
  memberName: string | null;
  previousMemberName: string | null;
};

export function presentHouseholdMemory(
  memory: HouseholdMemory,
  context: {
    routines: Array<{ id: string; name: string }>;
    tasks: Array<{ id: string; name: string }>;
    members: Array<{ id: string; first_name: string | null }>;
  },
): HouseholdMemoryPresentation {
  if (memory.type === "accepted_routine_adaptation") {
    const routine = context.routines.find(
      candidate => candidate.id === memory.routineId,
    );

    return {
      memoryId: memory.id,
      type: memory.type,
      occurredAt: memory.occurredAt,
      subjectName: routine?.name ?? null,
      memberName: null,
      previousMemberName: null,
    };
  }

  const task = context.tasks.find(
    candidate => candidate.id === memory.taskId,
  );
  const member = context.members.find(
    candidate => candidate.id === memory.suggestedMemberId,
  );
  const previousMember = memory.previousAssignedTo
    ? context.members.find(
        candidate => candidate.id === memory.previousAssignedTo,
      )
    : null;

  return {
    memoryId: memory.id,
    type: memory.type,
    occurredAt: memory.occurredAt,
    subjectName: task?.name ?? null,
    memberName: member?.first_name ?? null,
    previousMemberName: previousMember?.first_name ?? null,
  };
}
