import type { Household, Member } from "./types";

export type HouseholdOfflineMembership = {
  household: Household;
  member: Member;
};

export type HouseholdOfflineContext = {
  version: 1;
  userId: string;
  household: Household;
  me: Member;
  members: Member[];
  allMembers: Member[];
  memberships: HouseholdOfflineMembership[];
  cachedAt: string;
};

export function householdOfflineContextKey(userId: string): string {
  return `household-context:${userId}`;
}

export function createHouseholdOfflineContext(
  userId: string,
  household: Household,
  me: Member,
  members: Member[],
  allMembers: Member[],
  memberships: HouseholdOfflineMembership[],
  cachedAt: string
): HouseholdOfflineContext {
  return {
    version: 1,
    userId,
    household,
    me,
    members,
    allMembers,
    memberships,
    cachedAt,
  };
}

export function parseHouseholdOfflineContext(
  raw: string | null,
  userId: string
): HouseholdOfflineContext | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<HouseholdOfflineContext>;

    if (parsed.version !== 1) return null;
    if (parsed.userId !== userId) return null;
    if (!parsed.household || typeof parsed.household.id !== "string") return null;
    if (!parsed.me || typeof parsed.me.id !== "string") return null;
    if (parsed.me.user_id !== userId) return null;
    if (parsed.me.household_id !== parsed.household.id) return null;
    if (!Array.isArray(parsed.members)) return null;
    if (!Array.isArray(parsed.allMembers)) return null;
    if (!Array.isArray(parsed.memberships)) return null;
    if (typeof parsed.cachedAt !== "string") return null;

    return parsed as HouseholdOfflineContext;
  } catch {
    return null;
  }
}
