export type Appearance = "light" | "dark" | "auto";
export const APPEARANCE_KEY = "dabo-appearance-v32";
export const APPEARANCE_EVENT = "dabo-appearance-changed";
export function isAppearance(value: string | null): value is Appearance {
  return value === "light" || value === "dark" || value === "auto";
}
export function resolveDark(appearance: Appearance | null, legacyDark: boolean, systemDark: boolean): boolean {
  return appearance === "auto" ? systemDark : appearance === "dark" ? true : appearance === "light" ? false : legacyDark;
}
