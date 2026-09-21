export const LIFE_CONTEXT_TYPES = [
  "busy_period",
  "studies",
  "travel",
  "away",
  "reduced_availability",
  "other",
] as const;

export type LifeContextType = (typeof LIFE_CONTEXT_TYPES)[number];

export const LIFE_CONTEXT_IMPACTS = [
  "reduced",
  "very_reduced",
] as const;

export type LifeContextImpact = (typeof LIFE_CONTEXT_IMPACTS)[number];

export type MemberLifeContext = {
  id: string;
  household_id: string;
  member_id: string;
  context_type: LifeContextType;
  impact: LifeContextImpact;
  starts_on: string;
  ends_on: string;
  created_at: string;
  updated_at: string;
};

export function isLifeContextActive(
  context: MemberLifeContext,
  today: string
): boolean {
  return context.starts_on <= today && context.ends_on >= today;
}

export function getActiveLifeContext(
  contexts: MemberLifeContext[],
  memberId: string,
  today: string
): MemberLifeContext | null {
  return (
    contexts.find(
      (context) =>
        context.member_id === memberId &&
        isLifeContextActive(context, today)
    ) ?? null
  );
}

export function hasReducedAvailability(
  contexts: MemberLifeContext[],
  memberId: string,
  today: string
): boolean {
  return getActiveLifeContext(contexts, memberId, today) !== null;
}
