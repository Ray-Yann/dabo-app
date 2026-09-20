export function tutorialIntroKey(userId: string, id: string) {
  return `dabo-intro-${userId}-${id}`;
}

export function tutorialInviteNudgeKey(userId: string, householdId: string) {
  return `dabo-invite-nudge-${userId}-${householdId}`;
}

export function clearTutorialLocalStateForUser(userId: string) {
  const introPrefix = `dabo-intro-${userId}-`;
  const invitePrefix = `dabo-invite-nudge-${userId}-`;
  Object.keys(localStorage)
    .filter((key) => key.startsWith(introPrefix) || key.startsWith(invitePrefix))
    .forEach((key) => localStorage.removeItem(key));
}
