export const CONTEXTUAL_SHARE_SUCCESS_THRESHOLD = 3;
export const CONTEXTUAL_SHARE_LATER_MS = 7 * 24 * 60 * 60 * 1000;
export const CONTEXTUAL_SHARE_SHARED_MS = 30 * 24 * 60 * 60 * 1000;
export const CONTEXTUAL_SHARE_SUCCESS_EVENT = "dabo:contextual-share-success";

type ContextualSharePreference = {
  successCount: number;
  nextPromptAt: number | null;
};

function storageKey(userId: string, householdId: string) {
  return `dabo:contextual-share:${userId}:${householdId}`;
}

export function contextualShareSessionKey(userId: string, householdId: string) {
  return `dabo:contextual-share-shown:${userId}:${householdId}`;
}

function readPreference(userId: string, householdId: string): ContextualSharePreference {
  if (typeof window === "undefined") {
    return { successCount: 0, nextPromptAt: null };
  }

  try {
    const raw = window.localStorage.getItem(storageKey(userId, householdId));
    if (!raw) return { successCount: 0, nextPromptAt: null };

    const parsed = JSON.parse(raw) as Partial<ContextualSharePreference>;
    return {
      successCount:
        typeof parsed.successCount === "number" && Number.isFinite(parsed.successCount)
          ? Math.max(0, Math.floor(parsed.successCount))
          : 0,
      nextPromptAt:
        typeof parsed.nextPromptAt === "number" && Number.isFinite(parsed.nextPromptAt)
          ? parsed.nextPromptAt
          : null,
    };
  } catch {
    return { successCount: 0, nextPromptAt: null };
  }
}

function writePreference(
  userId: string,
  householdId: string,
  preference: ContextualSharePreference,
) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      storageKey(userId, householdId),
      JSON.stringify(preference),
    );
  } catch {
    // Le partage contextuel reste best-effort : il ne doit jamais casser
    // une complétion de tâche ou un achat.
  }
}

function wasPromptedThisSession(userId: string, householdId: string) {
  if (typeof window === "undefined") return false;

  try {
    return (
      window.sessionStorage.getItem(
        contextualShareSessionKey(userId, householdId),
      ) === "1"
    );
  } catch {
    return false;
  }
}

export function recordContextualShareSuccess(
  userId: string,
  householdId: string,
) {
  const current = readPreference(userId, householdId);

  writePreference(userId, householdId, {
    ...current,
    successCount: current.successCount + 1,
  });

  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent(CONTEXTUAL_SHARE_SUCCESS_EVENT, {
          detail: { userId, householdId },
        }),
      );
    } catch {
      // Signal UI best-effort uniquement.
    }
  }
}

export function contextualShareEligible(
  userId: string,
  householdId: string,
  now = Date.now(),
) {
  if (wasPromptedThisSession(userId, householdId)) return false;

  const preference = readPreference(userId, householdId);

  if (preference.successCount < CONTEXTUAL_SHARE_SUCCESS_THRESHOLD) {
    return false;
  }

  if (
    preference.nextPromptAt !== null &&
    preference.nextPromptAt > now
  ) {
    return false;
  }

  return true;
}

export function markContextualSharePromptShown(
  userId: string,
  householdId: string,
) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      contextualShareSessionKey(userId, householdId),
      "1",
    );
  } catch {
    // Limitation de session best-effort.
  }
}

export function postponeContextualShare(
  userId: string,
  householdId: string,
  now = Date.now(),
) {
  const current = readPreference(userId, householdId);

  writePreference(userId, householdId, {
    ...current,
    nextPromptAt: now + CONTEXTUAL_SHARE_LATER_MS,
  });
}

export function markContextualShareShared(
  userId: string,
  householdId: string,
  now = Date.now(),
) {
  writePreference(userId, householdId, {
    successCount: 0,
    nextPromptAt: now + CONTEXTUAL_SHARE_SHARED_MS,
  });
}
