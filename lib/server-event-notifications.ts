import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { translateWithParams, type Lang } from "@/lib/i18n";

type SendEventNotificationOptions = {
  admin: SupabaseClient;
  householdId: string;
  excludeMemberId?: string | null;
  targetMemberIds?: string[];
  key: string;
  params?: Record<string, string>;
  eventDeliveryKey?: string | null;
};

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    throw new Error("Configuration VAPID manquante");
  }

  webpush.setVapidDetails(
    "mailto:contact@dabo.app",
    publicKey,
    privateKey
  );
}

export async function sendEventNotification({
  admin,
  householdId,
  excludeMemberId,
  targetMemberIds,
  key,
  params = {},
  eventDeliveryKey = null,
}: SendEventNotificationOptions) {
  let membersQuery = admin
    .from("members")
    .select("id, user_id, language")
    .eq("household_id", householdId)
    .is("left_at", null)
    .not("user_id", "is", null)
    .neq("id", excludeMemberId || "");

  if (targetMemberIds !== undefined) {
    if (targetMemberIds.length === 0) {
      return 0;
    }

    membersQuery = membersQuery.in("id", targetMemberIds);
  }

  const { data: members } = await membersQuery;

  if (!members || members.length === 0) {
    return 0;
  }

  configureWebPush();

  let sent = 0;
  const deliveredEndpoints = new Set<string>();

  for (const member of members) {
    // Un même compte peut avoir plusieurs profils actifs dans plusieurs foyers.
    // Le terminal peut être enregistré sous n'importe lequel de ces profils.
    const { data: accountMemberships } = await admin
      .from("members")
      .select("id")
      .eq("user_id", member.user_id)
      .is("left_at", null);

    const accountMemberIds = (accountMemberships || []).map(
      (membership) => membership.id
    );

    if (accountMemberIds.length === 0) continue;

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("*")
      .in("member_id", accountMemberIds);

    let eventDeliveryClaimed = false;

    if (eventDeliveryKey) {
      const { error: claimError } = await admin
        .from("event_notification_deliveries")
        .insert({
          event_key: eventDeliveryKey,
          member_id: member.id,
        });

      if (claimError) {
        if (claimError.code === "23505") {
          continue;
        }

        console.error("[event-notification] Event delivery claim failed", {
          memberId: member.id,
          eventKey: eventDeliveryKey,
          code: claimError.code ?? null,
        });
        continue;
      }

      eventDeliveryClaimed = true;
    }

    const lang: Lang = (member.language as Lang) || "fr";
    const body = translateWithParams(lang, key, params);

    let memberDelivered = false;

    for (const sub of subs || []) {
      if (deliveredEndpoints.has(sub.endpoint)) continue;

      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({ title: "Dabo", body })
        );

        deliveredEndpoints.add(sub.endpoint);
        memberDelivered = true;
        sent++;
      } catch (error: unknown) {
        const statusCode = (error as { statusCode?: number })?.statusCode;

        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("[event-notification] Web Push failed", {
            memberId: member.id,
            subscriptionId: sub.id,
            statusCode: statusCode ?? null,
            message:
              error instanceof Error
                ? error.message
                : "Unknown Web Push error",
          });
        }
      }
    }

    if (eventDeliveryClaimed && !memberDelivered && eventDeliveryKey) {
      const { error: releaseError } = await admin
        .from("event_notification_deliveries")
        .delete()
        .eq("event_key", eventDeliveryKey)
        .eq("member_id", member.id);

      if (releaseError) {
        console.error("[event-notification] Event delivery claim release failed", {
          memberId: member.id,
          eventKey: eventDeliveryKey,
          code: releaseError.code ?? null,
        });
      }
    }
  }

  return sent;
}
