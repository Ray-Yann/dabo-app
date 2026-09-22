export type ScenarioMemberLoad = {
  memberId: string;
  weightPoints: number;
};

export type ScenarioSnapshot = {
  members: ScenarioMemberLoad[];
  unassignedWeightPoints: number;
};

export type ScenarioReassignment = {
  type: "reassign_load";
  fromMemberId: string | null;
  toMemberId: string | null;
  weightPoints: number;
};

export type ScenarioCapacityReduction = {
  type: "reduce_capacity";
  memberId: string;
  capacityReduction: "reduced" | "very_reduced";
};

export type HouseholdScenarioOperation =
  | ScenarioReassignment
  | ScenarioCapacityReduction;

export type ScenarioDistributionInterpretation =
  | "less_concentrated"
  | "more_concentrated"
  | "similar_distribution"
  | "not_comparable";

export type ScenarioMemberChange = {
  memberId: string;
  beforeWeightPoints: number;
  afterWeightPoints: number;
  deltaWeightPoints: number;
};

export type ScenarioCapacityNote = {
  memberId: string;
  capacityReduction: "reduced" | "very_reduced";
};

export type HouseholdScenarioResult = {
  before: ScenarioSnapshot;
  after: ScenarioSnapshot;
  memberChanges: ScenarioMemberChange[];
  capacityNotes: ScenarioCapacityNote[];
  beforeConcentration: number | null;
  afterConcentration: number | null;
  interpretation: ScenarioDistributionInterpretation;
};

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite non-negative number`);
  }
}

function cloneSnapshot(snapshot: ScenarioSnapshot): ScenarioSnapshot {
  return {
    members: snapshot.members.map((member) => ({ ...member })),
    unassignedWeightPoints: snapshot.unassignedWeightPoints,
  };
}

function validateSnapshot(snapshot: ScenarioSnapshot): void {
  assertFiniteNonNegative(
    snapshot.unassignedWeightPoints,
    "unassignedWeightPoints",
  );

  const memberIds = new Set<string>();

  for (const member of snapshot.members) {
    if (!member.memberId) {
      throw new Error("memberId is required");
    }

    if (memberIds.has(member.memberId)) {
      throw new Error(`Duplicate memberId: ${member.memberId}`);
    }

    memberIds.add(member.memberId);
    assertFiniteNonNegative(member.weightPoints, "weightPoints");
  }
}

function totalLoad(snapshot: ScenarioSnapshot): number {
  return (
    snapshot.members.reduce(
      (sum, member) => sum + member.weightPoints,
      0,
    ) + snapshot.unassignedWeightPoints
  );
}

function concentration(snapshot: ScenarioSnapshot): number | null {
  if (snapshot.members.length < 2) {
    return null;
  }

  const assignedTotal = snapshot.members.reduce(
    (sum, member) => sum + member.weightPoints,
    0,
  );

  if (assignedTotal <= 0) {
    return null;
  }

  const largestLoad = Math.max(
    ...snapshot.members.map((member) => member.weightPoints),
  );

  return largestLoad / assignedTotal;
}

function applyReassignment(
  snapshot: ScenarioSnapshot,
  operation: ScenarioReassignment,
): void {
  assertFiniteNonNegative(operation.weightPoints, "weightPoints");

  if (operation.weightPoints === 0) {
    return;
  }

  if (operation.fromMemberId === operation.toMemberId) {
    throw new Error("Scenario source and destination must be different");
  }

  const fromMember =
    operation.fromMemberId === null
      ? null
      : snapshot.members.find(
          (member) => member.memberId === operation.fromMemberId,
        );

  const toMember =
    operation.toMemberId === null
      ? null
      : snapshot.members.find(
          (member) => member.memberId === operation.toMemberId,
        );

  if (operation.fromMemberId !== null && !fromMember) {
    throw new Error(`Unknown source member: ${operation.fromMemberId}`);
  }

  if (operation.toMemberId !== null && !toMember) {
    throw new Error(
      `Unknown destination member: ${operation.toMemberId}`,
    );
  }

  const available =
    operation.fromMemberId === null
      ? snapshot.unassignedWeightPoints
      : fromMember!.weightPoints;

  if (operation.weightPoints > available) {
    throw new Error("Scenario cannot move more load than is available");
  }

  if (operation.fromMemberId === null) {
    snapshot.unassignedWeightPoints -= operation.weightPoints;
  } else {
    fromMember!.weightPoints -= operation.weightPoints;
  }

  if (operation.toMemberId === null) {
    snapshot.unassignedWeightPoints += operation.weightPoints;
  } else {
    toMember!.weightPoints += operation.weightPoints;
  }
}

function interpretationFor(
  before: number | null,
  after: number | null,
): ScenarioDistributionInterpretation {
  if (before === null || after === null) {
    return "not_comparable";
  }

  const difference = after - before;
  const epsilon = 0.000001;

  if (Math.abs(difference) <= epsilon) {
    return "similar_distribution";
  }

  return difference < 0
    ? "less_concentrated"
    : "more_concentrated";
}

export function simulateHouseholdScenario(
  input: ScenarioSnapshot,
  operations: HouseholdScenarioOperation[],
): HouseholdScenarioResult {
  validateSnapshot(input);

  const before = cloneSnapshot(input);
  const after = cloneSnapshot(input);
  const capacityNotes: ScenarioCapacityNote[] = [];

  for (const operation of operations) {
    if (operation.type === "reassign_load") {
      applyReassignment(after, operation);
      continue;
    }

    const memberExists = after.members.some(
      (member) => member.memberId === operation.memberId,
    );

    if (!memberExists) {
      throw new Error(`Unknown member: ${operation.memberId}`);
    }

    capacityNotes.push({
      memberId: operation.memberId,
      capacityReduction: operation.capacityReduction,
    });
  }

  const beforeTotal = totalLoad(before);
  const afterTotal = totalLoad(after);

  if (Math.abs(beforeTotal - afterTotal) > 0.000001) {
    throw new Error("Scenario must preserve total household load");
  }

  const memberChanges = before.members.map((member) => {
    const projected = after.members.find(
      (candidate) => candidate.memberId === member.memberId,
    );

    if (!projected) {
      throw new Error(`Missing projected member: ${member.memberId}`);
    }

    return {
      memberId: member.memberId,
      beforeWeightPoints: member.weightPoints,
      afterWeightPoints: projected.weightPoints,
      deltaWeightPoints: projected.weightPoints - member.weightPoints,
    };
  });

  const beforeConcentration = concentration(before);
  const afterConcentration = concentration(after);

  return {
    before,
    after,
    memberChanges,
    capacityNotes,
    beforeConcentration,
    afterConcentration,
    interpretation: interpretationFor(
      beforeConcentration,
      afterConcentration,
    ),
  };
}
