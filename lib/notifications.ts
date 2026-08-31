import { SupabaseClient } from "@supabase/supabase-js";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function enableNotifications(supabase: SupabaseClient, memberId: string) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Les notifications ne sont pas prises en charge sur cet appareil/navigateur.");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permission refusée.");
  }
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
  });

  const json = subscription.toJSON();
  await supabase.from("push_subscriptions").upsert(
    {
      member_id: memberId,
      endpoint: json.endpoint,
      p256dh: json.keys!.p256dh,
      auth: json.keys!.auth,
    },
    { onConflict: "endpoint" }
  );
}

export async function notifyHousehold(
  supabase: SupabaseClient,
  householdId: string,
  excludeMemberId: string,
  key: string,
  params: Record<string, string>
) {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    await fetch("/api/send-notification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify({ householdId, excludeMemberId, key, params }),
    });
  } catch (e) {
    // Une notification manquée ne doit jamais bloquer l'action principale de l'utilisateur.
  }
}
