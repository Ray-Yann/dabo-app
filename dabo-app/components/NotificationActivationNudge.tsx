"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Bell } from "lucide-react";
import { enableNotifications, requiresIosHomeScreenInstall } from "@/lib/notifications";
import { clearNotificationNudge, hasVerifiedPushSubscription, postponeNotificationNudge, readNotificationNudgePreference } from "@/lib/notification-activation";
import { useT } from "@/lib/language-context";

type Props = { supabase: SupabaseClient; memberId: string; userId: string };

export function NotificationActivationNudge({ supabase, memberId, userId }: Props) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [iosInstallRequired, setIosInstallRequired] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setIosInstallRequired(requiresIosHomeScreenInstall());
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
      if (Notification.permission === "denied") return;
      const active = await hasVerifiedPushSubscription(supabase, memberId);
      if (cancelled || active) {
        if (active) clearNotificationNudge(userId);
        return;
      }
      const preference = readNotificationNudgePreference(userId);
      if (!preference.stopped && Date.now() >= preference.nextPromptAt) setVisible(true);
    })();
    return () => { cancelled = true; };
  }, [memberId, supabase, userId]);

  if (!visible) return null;

  async function activate() {
    setLoading(true);
    setError(false);
    try {
      await enableNotifications(supabase, memberId);
      const active = await hasVerifiedPushSubscription(supabase, memberId);
      if (!active) throw new Error("Push subscription not persisted");
      clearNotificationNudge(userId);
      setVisible(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  function postpone(choice: "later" | "no") {
    postponeNotificationNudge(userId, choice);
    setVisible(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 px-4 pb-5 sm:pb-0" role="dialog" aria-modal="true" aria-labelledby="notification-nudge-title">
      <div className="w-full max-w-md rounded-3xl bg-paper border border-border p-5 shadow-xl">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-mustardBg mb-4"><Bell size={19} /></div>
        <h2 id="notification-nudge-title" className="text-lg font-semibold text-ink">{t("notification_nudge_title")}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{t("notification_nudge_text")}</p>
        {iosInstallRequired && <p className="mt-3 text-xs leading-5 text-ink">{t("notification_nudge_ios_install")}</p>}
        {error && !iosInstallRequired && <p className="mt-3 text-xs text-red-700">{t("settings_notifications_error")}</p>}
        <button type="button" disabled={loading || iosInstallRequired} onClick={() => void activate()} className="mt-5 w-full rounded-xl bg-ink px-4 py-3 text-sm font-medium text-paper disabled:opacity-50">
          {loading ? "…" : iosInstallRequired ? t("notification_nudge_ios_button") : t("notification_nudge_enable")}
        </button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" disabled={loading} onClick={() => postpone("later")} className="rounded-xl border border-border px-3 py-2.5 text-sm text-ink disabled:opacity-50">{t("notification_nudge_later")}</button>
          <button type="button" disabled={loading} onClick={() => postpone("no")} className="rounded-xl px-3 py-2.5 text-sm text-muted disabled:opacity-50">{t("notification_nudge_no")}</button>
        </div>
      </div>
    </div>
  );
}
