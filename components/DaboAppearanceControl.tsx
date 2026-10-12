"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, SunMoon } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { APPEARANCE_EVENT, APPEARANCE_KEY, type Appearance, isAppearance } from "@/lib/dabo-appearance";

const translations = {
  fr: ["Apparence", "Clair", "Sombre", "Automatique"],
  nl: ["Weergave", "Licht", "Donker", "Automatisch"],
  en: ["Appearance", "Light", "Dark", "Automatic"],
  de: ["Darstellung", "Hell", "Dunkel", "Automatisch"],
  es: ["Apariencia", "Claro", "Oscuro", "Automático"],
  it: ["Aspetto", "Chiaro", "Scuro", "Automatico"],
  pt: ["Aparência", "Claro", "Escuro", "Automático"],
} as const;

export function DaboAppearanceControl({ legacyDark }: { legacyDark: boolean }) {
  const lang = useLanguage();
  const [selected, setSelected] = useState<Appearance | null>(null);
  useEffect(() => {
    const saved = window.localStorage.getItem(APPEARANCE_KEY);
    setSelected(isAppearance(saved) ? saved : null);
  }, []);
  const labels = translations[lang] || translations.fr;
  const mode = selected || (legacyDark ? "dark" : "light");
  function choose(value: Appearance) {
    window.localStorage.setItem(APPEARANCE_KEY, value);
    window.dispatchEvent(new Event(APPEARANCE_EVENT));
    setSelected(value);
  }
  return <div className="dabo-appearance-control dabo-appearance-inline" role="group" aria-label={labels[0]}>
    {(["light", "dark", "auto"] as const).map((value, index) => (
      <button key={value} type="button" className="dabo-appearance-option" aria-pressed={mode === value} onClick={() => choose(value)}>
        {value === "light" ? <Sun size={16} aria-hidden="true"/> : value === "dark" ? <Moon size={16} aria-hidden="true"/> : <SunMoon size={16} aria-hidden="true"/>}
        <span>{labels[index + 1]}</span>
      </button>
    ))}
  </div>;
}
