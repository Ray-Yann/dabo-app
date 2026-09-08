"use client";

import { useMemo, useState } from "react";
import { getSmartSuggestions } from "@/lib/smart-suggestions";

export function SmartNameInput({ value, onChange, placeholder, learnedTerms, autoFocus = false, className = "" }: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  learnedTerms: string[];
  autoFocus?: boolean;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  const suggestions = useMemo(() => getSmartSuggestions(value, learnedTerms), [value, learnedTerms]);
  const open = focused && value.trim().length > 0 && suggestions.length > 0;

  return <div className="relative">
    <input
      autoFocus={autoFocus}
      autoComplete="off"
      spellCheck={false}
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
