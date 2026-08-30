"use client";

import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";

export function IntroTip({ id, text }: { id: string; text: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(`dabo-intro-${id}`);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!seen) setVisible(true);
  }, [id]);

  function dismiss() {
    localStorage.setItem(`dabo-intro-${id}`, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="mx-5 mb-4 flex items-start gap-2 bg-mustardBg rounded-xl p-3 text-xs text-ink">
      <Info size={14} className="shrink-0 mt-0.5 text-mustard" />
      <span className="flex-1">{text}</span>
      <button onClick={dismiss} className="text-muted shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}
