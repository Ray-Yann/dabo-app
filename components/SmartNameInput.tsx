"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { getSmartSuggestions, loadLanguageLexicon, type SuggestionDomain } from "@/lib/smart-suggestions";

export function SmartNameInput({ value, onChange, placeholder, learnedTerms, domain, autoFocus = false, className = "" }: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  learnedTerms: string[];
  domain: SuggestionDomain;
  autoFocus?: boolean;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [lexicon, setLexicon] = useState<string[]>([]);
  const lang = useLanguage();
  const queryLength = value.trim().length;

  useEffect(() => {
    let cancelled = false;
    setLexicon([]);
    // Le dictionnaire complet est chargé seulement quand la personne commence réellement un mot.
    // Les termes du foyer et DABO restent disponibles dès la première lettre.
    if (!focused || queryLength < 2) return;
    loadLanguageLexicon(lang).then((words) => {
      if (!cancelled) setLexicon(words);
    });
    return () => { cancelled = true; };
  }, [focused, lang, queryLength >= 2]);

  const suggestions = useMemo(
    () => getSmartSuggestions(value, learnedTerms, { lang, domain, lexicon }),
    [value, learnedTerms, lang, domain, lexicon],
  );
  const open = focused && queryLength > 0 && suggestions.length > 0;

  return <div className="relative">
    <input
      autoFocus={autoFocus}
      autoComplete="off"
      spellCheck
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => window.setTimeout(() => setFocused(false), 120)}
      className={className}
    />
    {open && <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-border bg-white2 shadow-lg overflow-hidden">
      {suggestions.map((suggestion) => <button
        key={suggestion}
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => { onChange(suggestion); setFocused(false); }}
        className="w-full text-left px-3 py-2.5 text-sm text-ink hover:bg-paper border-b border-border/60 last:border-b-0"
      >{suggestion}</button>)}
    </div>}
  </div>;
}
