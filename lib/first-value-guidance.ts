export type FirstValueGuidanceType = "task" | "shopping" | "calendar";

const FIRST_VALUE_GUIDANCE_KEY = "dabo:first-value-guidance";

function isFirstValueGuidanceType(
  value: string | null,
): value is FirstValueGuidanceType {
  return value === "task" || value === "shopping" || value === "calendar";
}

export function startFirstValueGuidance(type: FirstValueGuidanceType) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(FIRST_VALUE_GUIDANCE_KEY, type);
  } catch {
    // Le guidage de première valeur reste best-effort :
    // il ne doit jamais bloquer la navigation.
  }
}

export function readFirstValueGuidance(): FirstValueGuidanceType | null {
  if (typeof window === "undefined") return null;

  try {
    const value = window.sessionStorage.getItem(FIRST_VALUE_GUIDANCE_KEY);
    return isFirstValueGuidanceType(value) ? value : null;
  } catch {
    return null;
  }
}

export function isFirstValueGuidanceActive(type: FirstValueGuidanceType) {
  return readFirstValueGuidance() === type;
}

export function completeFirstValueGuidance(type: FirstValueGuidanceType) {
  if (typeof window === "undefined") return false;

  try {
    if (window.sessionStorage.getItem(FIRST_VALUE_GUIDANCE_KEY) !== type) {
      return false;
    }

    window.sessionStorage.removeItem(FIRST_VALUE_GUIDANCE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function cancelFirstValueGuidance(type: FirstValueGuidanceType) {
  if (typeof window === "undefined") return;

  try {
    if (window.sessionStorage.getItem(FIRST_VALUE_GUIDANCE_KEY) === type) {
      window.sessionStorage.removeItem(FIRST_VALUE_GUIDANCE_KEY);
    }
  } catch {
    // Nettoyage best-effort uniquement.
  }
}
