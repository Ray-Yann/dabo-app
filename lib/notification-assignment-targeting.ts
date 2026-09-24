type AssignmentMemberId = string | null | undefined;

/**
 * Retourne uniquement les membres nouvellement concernés par une attribution.
 *
 * - préserve l'ordre de la nouvelle attribution ;
 * - déduplique les membres ;
 * - ignore les valeurs vides ;
 * - ne renotifie pas une personne déjà concernée auparavant ;
 * - ne notifie jamais la personne qui réalise elle-même l'action.
 */
export function newlyAssignedMemberIds(
  previousMemberIds: AssignmentMemberId[],
  nextMemberIds: AssignmentMemberId[],
  actorMemberId: string | null | undefined
): string[] {
  const previous = new Set(
    previousMemberIds.filter(
      (memberId): memberId is string =>
        typeof memberId === "string" && memberId.length > 0
    )
  );

  const result: string[] = [];
  const seen = new Set<string>();

  for (const memberId of nextMemberIds) {
    if (
      typeof memberId !== "string" ||
      memberId.length === 0 ||
      memberId === actorMemberId ||
      previous.has(memberId) ||
      seen.has(memberId)
    ) {
      continue;
    }

    seen.add(memberId);
    result.push(memberId);
  }

  return result;
}
