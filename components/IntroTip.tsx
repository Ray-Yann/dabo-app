"use client";

import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { useT } from "@/lib/language-context";
import { getTutorialEnabled, setTutorialEnabled, TUTORIAL_EVENT } from "@/lib/tutorial-preferences";

export function IntroTip({ id, title, text }: { id: string; title?: string; text: string }) {
  const t = useT();
  const [supabase] = useState(() => createClient());
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const enabled = await getTutorialEnabled(supabase);
      const seen = localStorage.getItem(`dabo-intro-${id}`);
      if (active) setVisible(enabled && !seen);
    }
    void load();
    const onPreference = (event: Event) => {
      const enabled = (event as CustomEvent<{ enabled: boolean }>).detail?.enabled;
      if (enabled === false) setVisible(false);
      if (enabled === true && !localStorage.getItem(`dabo-intro-${id}`)) setVisible(true);
    };
    window.addEventListener(TUTORIAL_EVENT, onPreference);
    return () => { active = false; window.removeEventListener(TUTORIAL_EVENT, onPreference); };
  }, [id, supabase]);

  function dismiss() {
    localStorage.setItem(`dabo-intro-${id}`, "1");
    setVisible(false);
  }

  async function disableAll() {
    try { await setTutorialEnabled(supabase, false); } finally { setVisible(false); }
  }

  if (!visible) return null;

  return (
    <div className="mx-5 mb-4 bg-mustardBg rounded-xl p-3 text-xs text-ink" role="status">
      <div className="flex items-start gap-2">
        <Info size={14} className="shrink-0 mt-0.5 text-mustard" />
        <div className="flex-1">
          {title && <div className="font-semibold text-ink mb-0.5">{title}</div>}
          <div className="leading-relaxed">{text}</div>
        </div>
        <button onClick={dismiss} className="text-muted shrink-0" aria-label={t("tutorial_later")}><X size={14} /></button>
      </div>
      <div className="mt-2 pl-5 flex flex-wrap gap-x-3 gap-y-1">
        <button onClick={dismiss} className="font-medium text-ink underline underline-offset-2">{t("tutorial_later")}</button>
        <button onClick={() => void disableAll()} className="text-muted underline underline-offset-2">{t("tutorial_never_show")}</button>
      </div>
    </div>
  );
}
