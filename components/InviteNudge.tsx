"use client";

import { useEffect, useState } from "react";
import { UserPlus, X } from "lucide-react";

export function InviteNudge({
  householdId,
  memberCount,
  householdType,
  text,
}: {
  householdId: string;
  memberCount: number;
  householdType: string;
  text: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Un couple est complet par définition à 2 — pas de rappel dans ce cas.
    if (householdType === "couple" || memberCount >= 3) return;
    const key = `dabo-invite-nudge-${householdId}`;
    const count = parseInt(localStorage.getItem(key) || "0", 10);
    if (count >= 2) return;
    localStorage.setItem(key, String(count + 1));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
  }, [householdId, memberCount, householdType]);

  if (!visible) return null;

  return (
    <div className="mx-5 mb-4 flex items-start gap-2 bg-mustardBg rounded-xl p-3 text-xs text-ink">
      <UserPlus size={14} className="shrink-0 mt-0.5 text-mustard" />
      <span className="flex-1">{text}</span>
      <button onClick={() => setVisible(false)} className="text-muted shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}
