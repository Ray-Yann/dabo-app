"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";

export function CourseNamePreviewInput({
  value,
  onCommit,
  placeholder,
  className = "",
  renderPreview,
}: {
  value: string;
  onCommit: (value: string) => void;
  placeholder: string;
  className?: string;
  renderPreview: (name: string) => React.ReactNode;
}) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(value);
  }, [value, focused]);

  function commit() {
    setFocused(false);
    if (draft !== value) {
      flushSync(() => onCommit(draft));
    }
  }

  return (
    <div className="flex items-center gap-3">
      <input
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
      {draft.trim() && (
        <div className="shrink-0" aria-label={draft}>
          {renderPreview(draft)}
        </div>
      )}
    </div>
  );
}