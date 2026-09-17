import type { SupabaseClient } from "@supabase/supabase-js";

export const NOTIFICATION_LATER_MS = 24 * 60 * 60 * 1000;
export const NOTIFICATION_NO_THANKS_MS = 7 * 24 * 60 * 60 * 1000;

export type NotificationNudgePreference = {
  nextPromptAt: number;
  refusalCount: number;
  stopped: boolean;
};

export function notificationNudgeStorageKey(userId: string) {
  return `dabo:notification-nudge:${userId}`;
}

export function readNotificationNudgePreference(userId: string): NotificationNudgePreference {
  if (typeof window === "undefined") return { nextPromptAt: 0, refusalCount: 0, stopped: false };
  try {
    const raw = window.localStorage.getItem(notificationNudgeStorageKey(userId));
    if (!raw) return { nextPromptAt: 0, refusalCount: 0, stopped: false };
    const parsed = JSON.parse(raw) as Partial<NotificationNudgePreference>;
    return {
      nextPromptAt: typeof parsed.nextPromptAt === "number" ? parsed.nextPromptAt : 0,
      refusalCount: typeof parsed.refusalCount === "number" ? parsed.refusalCount : 0,
      stopped: parsed.stopped === true,
    };
  } catch {
    return { nextPromptAt: 0, refusalCount: 0, stopped: false };
  }
}

export function postponeNotificationNudge(userId: string, choice: "later" | "no", now = Date.now()) {
  if (typeof window === "undefined") return;
  const current = readNotificationNudgePreference(userId);
  const refusalCount = choice === "no" ? current.refusalCount + 1 : current.refusalCount;
  const stopped = choice === "no" && refusalCount >= 2;
  const nextPromptAt = stopped ? 0 : now + (choice === "later" ? NOTIFICATION_LATER_MS : NOTIFICATION_NO_THANKS_MS);
  window.localStorage.setItem(notificationNudgeStorageKey(userId), JSON.stringify({ nextPromptAt, refusalCount, stopped }));
}

export function clearNotificationNudge(userId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(notificationNudgeStorageKey(userId));
}

export function stopNotificationNudge(userId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(notificationNudgeStorageKey(userId), JSON.stringify({ nextPromptAt: 0, refusalCount: 2, stopped: true }));
}

export async function hasVerifiedPushSubscription(supabase: SupabaseClient, memberId: string) {
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (Notification.permission !== "granted") return false;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return false;
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("member_id", memberId)
    .eq("endpoint", subscription.endpoint)
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}
