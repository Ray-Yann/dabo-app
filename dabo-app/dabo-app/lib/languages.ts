import type { Lang } from "@/lib/i18n";

export type LanguageOption = {
  code: string;
  label: string;
  nativeLabel: string;
  available: boolean;
};

/**
 * Registre central des langues DABO.
 *
 * Une langue n'est `available: true` que lorsque son catalogue i18n est
 * complet et vérifié. Cela évite de proposer une langue qui ferait retomber
 * une partie de l'interface dans une autre langue.
 */
export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { code: "fr", label: "Français", nativeLabel: "Français", available: true },
  { code: "nl", label: "Néerlandais", nativeLabel: "Nederlands", available: true },
  { code: "en", label: "Anglais", nativeLabel: "English", available: true },
  { code: "de", label: "Allemand", nativeLabel: "Deutsch", available: true },
  { code: "es", label: "Espagnol", nativeLabel: "Español", available: true },
  { code: "it", label: "Italien", nativeLabel: "Italiano", available: true },
  { code: "pt", label: "Portugais", nativeLabel: "Português", available: true },
] as const;

export const AVAILABLE_LANGUAGE_OPTIONS = LANGUAGE_OPTIONS.filter(
  (language): language is LanguageOption & { code: Lang; available: true } =>
    language.available && ["fr", "nl", "en", "de", "es", "it", "pt"].includes(language.code)
);

export function isAvailableLang(value: string): value is Lang {
  return AVAILABLE_LANGUAGE_OPTIONS.some((language) => language.code === value);
}

export function detectAvailableLanguageFromDevice(): Lang {
  if (typeof navigator === "undefined") return "fr";
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const locale of candidates) {
    const code = locale.toLowerCase().split(/[-_]/)[0];
    if (isAvailableLang(code)) return code;
  }
  return "fr";
}
