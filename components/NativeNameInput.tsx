"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";

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
    if (draft !== value) {
      // The parent must receive the final native input value before a Save/Add
      // click is handled. This keeps typing local (fast on iOS/iPadOS) while
      // preventing the last edited value from being lost on blur.
      flushSync(() => onCommit(draft));
    }
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
