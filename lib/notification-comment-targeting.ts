type CommentMemberId = string | null | undefined;

export function commentNotificationRecipientIds(input: {
  actorMemberId: string | null | undefined;
  assignedMemberIds: CommentMemberId[];
  previousCommentAuthorIds: CommentMemberId[];
}): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const memberId of [
    ...input.assignedMemberIds,
    ...input.previousCommentAuthorIds,
  ]) {
    if (
      typeof memberId !== "string" ||
      memberId.length === 0 ||
      memberId === input.actorMemberId ||
      seen.has(memberId)
    ) {
      continue;
    }

    seen.add(memberId);
    result.push(memberId);
  }

  return result;
}
