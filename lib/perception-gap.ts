import type { WeeklyBalanceLevel } from "./household-weekly-report";

export type LoadPerception =
  | "balanced"
  | "i_carry_more"
  | "other_carries_more"
  | "unclear";

export type PerceptionGap =
  | "not_comparable"
  | "aligned"
  | "perceives_more_concentrated"
  | "perceives_more_balanced"
  | "different";

export type PerceptionGapInput = {
  perception: LoadPerception | null;
  memberId: string;
  memberShares: Array<{
    memberId: string;
    percentage: number;
  }>;
  balanceLevel: WeeklyBalanceLevel;
};

export function computePerceptionGap(
  input: PerceptionGapInput
): PerceptionGap {
  if (
    !input.perception ||
    input.perception === "unclear" ||
    input.balanceLevel === "building" ||
    input.memberShares.length < 2
  ) {
    return "not_comparable";
  }

  const own = input.memberShares.find(
    (share) => share.memberId === input.memberId
  );

  if (!own) return "not_comparable";

  const others = input.memberShares.filter(
    (share) => share.memberId !== input.memberId
  );

  if (others.length === 0) return "not_comparable";

  const highestOther = Math.max(
    ...others.map((share) => share.percentage)
  );

  const householdObservedBalanced =
    input.balanceLevel === "healthy";

  if (input.perception === "balanced") {
    return householdObservedBalanced
      ? "aligned"
      : "perceives_more_balanced";
  }

  if (input.perception === "i_carry_more") {
    if (householdObservedBalanced) {
      return "perceives_more_concentrated";
    }

    return own.percentage >= highestOther
      ? "aligned"
      : "different";
  }

  if (input.perception === "other_carries_more") {
    if (householdObservedBalanced) {
      return "perceives_more_concentrated";
    }

    return highestOther > own.percentage
      ? "aligned"
      : "different";
  }

  return "not_comparable";
}
