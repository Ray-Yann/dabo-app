"use client";

import { useEffect, useRef, useState } from "react";
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
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Appearance | null>(null);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const saved = window.localStorage.getItem(APPEARANCE_KEY);
    setSelected(isAppearance(saved) ? saved : null);
  }, []);
  useEffect(() => {
    if (!open) return;
    function close(event: PointerEvent) { if (!container.current?.contains(event.target as Node)) setOpen(false); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [open]);
  const labels = translations[lang] || translations.fr;
  const mode = selected || (legacyDark ? "dark" : "light");
  function choose(value: Appearance) {
    window.localStorage.setItem(APPEARANCE_KEY, value);
    window.dispatchEvent(new Event(APPEARANCE_EVENT));
    setSelected(value);
    setOpen(false);
  }
  return <div className="dabo-appearance-control" ref={container}>
    <button type="button" className="dabo-appearance-trigger" aria-label={labels[0]} aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(!open)}>
      {mode === "auto" ? <SunMoon size={19} aria-hidden="true"/> : mode === "dark" ? <Moon size={19} aria-hidden="true"/> : <Sun size={19} aria-hidden="true"/>}
    </button>
    {open && <div className="dabo-appearance-menu" role="group" aria-label={labels[0]}>
      {(["light", "dark", "auto"] as const).map((value, index) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => choose(value)}>{labels[index + 1]}{mode === value ? " ✓" : ""}</button>)}
    </div>}
  </div>;
}
