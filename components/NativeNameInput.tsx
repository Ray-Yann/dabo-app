"use client";

import { useEffect, useState } from "react";

export function NativeNameInput({
  value,
  onCommit,
  placeholder,
  autoFocus = false,
  className = "",
}: {
  value: string;
  onCommit: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(value);
  }, [value, focused]);

  function commit() {
    setFocused(false);
    if (draft !== value) onCommit(draft);
  }

  return (
    <input
      autoFocus={autoFocus}
      autoComplete="off"
      autoCorrect="on"
      autoCapitalize="sentences"
      spellCheck
      enterKeyHint="done"
      placeholder={placeholder}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={commit}
      className={className}
    />
  );
}
