"use client";

import { createContext, useContext } from "react";
import { Lang, translate } from "@/lib/i18n";

const LanguageContext = createContext<Lang>("fr");

export function LanguageProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LanguageContext.Provider value={lang}>{children}</LanguageContext.Provider>;
}

export function useT() {
  const lang = useContext(LanguageContext);
  return (key: string) => translate(lang, key);
}
