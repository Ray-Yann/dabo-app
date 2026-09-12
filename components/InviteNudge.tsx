"use client";

import { useEffect, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { useT } from "@/lib/language-context";
import { getTutorialEnabled, setTutorialEnabled } from "@/lib/tutorial-preferences";
import { tutorialInviteNudgeKey } from "@/lib/tutorial-local-storage";

export function InviteNudge({ householdId, memberCount, householdType, text }: { householdId: string; memberCount: number; householdType: string; text: string; }) {
  const router = useRouter();
  const t = useT();
  const [supabase] = useState(() => createClient());
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (householdType === "couple" || memberCount >= 3) return;
      const [{ data: userData }, enabled] = await Promise.all([supabase.auth.getUser(), getTutorialEnabled(supabase)]);
      if (!enabled || !userData.user?.id) return;
      const key = tutorialInviteNudgeKey(userData.user.id, householdId);
      const count = parseInt(localStorage.getItem(key) || "0", 10);
      if (count >= 3) return;
      localStorage.setItem(key, String(count + 1));
      if (active) setVisible(true);
    }
    void load();
    return () => { active = false; };
  }, [householdId, memberCount, householdType, supabase]);

  async function disableTutorial() {
    try { await setTutorialEnabled(supabase, false); } finally { setVisible(false); }
  }

  if (!visible) return null;
  return (
    <div className="mx-5 mb-4 bg-mustardBg rounded-xl p-3 text-xs text-ink">
      <div className="flex items-start gap-2">
        <UserPlus size={14} className="shrink-0 mt-0.5 text-mustard" />
        <span className="flex-1">{text}</span>
        <button onClick={() => setVisible(false)} className="text-muted shrink-0" aria-label={t("tutorial_later")}><X size={14} /></button>
      </div>
      <div className="mt-2 pl-5 flex flex-wrap gap-x-3 gap-y-1">
        <button onClick={() => router.push("/app/reglages?guide=invite")} className="font-semibold text-ink underline underline-offset-2">{t("tutorial_show_me")}</button>
        <button onClick={() => setVisible(false)} className="text-ink">{t("tutorial_later")}</button>
        <button onClick={() => void disableTutorial()} className="text-muted">{t("tutorial_never_show")}</button>
      </div>
    </div>
  );
}
