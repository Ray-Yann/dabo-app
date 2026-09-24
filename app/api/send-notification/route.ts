import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient, verifyUserToken } from "@/lib/supabase-admin";
import { translateWithParams, Lang } from "@/lib/i18n";

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

// Seules ces clés peuvent déclencher une notification — empêche quiconque
// d'injecter un texte arbitraire dans une notification, même en cas de jeton
// valide détourné.
const ALLOWED_KEYS = ["notif_item_bought", "notif_task_done", "notif_item_urgent", "notif_task_urgent", "notif_member_joined", "notif_task_assigned", "notif_item_assigned"];
const TARGETED_ONLY_KEYS = ["notif_task_assigned", "notif_item_assigned"];

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { householdId, excludeMemberId, targetMemberIds, key, params } = await req.json();
  if (!householdId || !key) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }
  if (!ALLOWED_KEYS.includes(key)) {
    return NextResponse.json({ error: "Message non autorisé" }, { status: 400 });
  }

  if (TARGETED_ONLY_KEYS.includes(key) && targetMemberIds === undefined) {
    return NextResponse.json(
      { error: "Cette notification exige un destinataire ciblé" },
      { status: 400 }
    );
  }

  if (
    targetMemberIds !== undefined &&
    (
      !Array.isArray(targetMemberIds) ||
      targetMemberIds.length > 50 ||
      targetMemberIds.some(
        (id: unknown) => typeof id !== "string" || id.length === 0
      )
    )
  ) {
    return NextResponse.json(
      { error: "Destinataires invalides" },
      { status: 400 }
    );
  }

  const userData = await verifyUserToken(token);
  if (!userData) {
    return NextResponse.json({ error: "Session invalide" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Vérifie que la personne qui déclenche la notification est bien elle-même
  // membre de ce foyer précis — jamais de foyer arbitraire fourni par le client.
  const { data: callerMember } = await admin
    .from("members")
    .select("id")
    .eq("id", excludeMemberId)
    .eq("household_id", householdId)
    .eq("user_id", userData.id)
    .is("left_at", null)
    .maybeSingle();

  if (!callerMember) {
    return NextResponse.json({ error: "Non autorisé pour ce foyer" }, { status: 403 });
  }

  let membersQuery = admin
    .from("members")
    .select("id, user_id, language")
    .eq("household_id", householdId)
    .is("left_at", null)
    .not("user_id", "is", null)
    .neq("id", excludeMemberId || "");

  if (targetMemberIds !== undefined) {
    if (targetMemberIds.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    membersQuery = membersQuery.in("id", targetMemberIds);
  }

  const { data: members } = await membersQuery;

  if (!members || members.length === 0) return NextResponse.json({ sent: 0 });

  try {
    configureWebPush();
  } catch {
    return NextResponse.json(
      { error: "Configuration des notifications indisponible" },
      { status: 503 }
    );
  }

  let sent = 0;
  const deliveredEndpoints = new Set<string>();
  for (const member of members) {
    // Depuis le multi-foyers, un même compte possède un profil membre différent
    // dans chaque foyer. L'abonnement Push reste attaché au terminal et son
    // endpoint est unique : il peut donc être enregistré sous n'importe lequel
    // des profils actifs de ce compte. On retrouve tous ces profils avant
    // d'envoyer, au lieu de supposer que l'abonnement est sur le profil du
    // foyer qui vient de déclencher l'événement.
    const { data: accountMemberships } = await admin
      .from("members")
      .select("id")
      .eq("user_id", member.user_id)
      .is("left_at", null);
    const accountMemberIds = (accountMemberships || []).map((membership) => membership.id);
    if (accountMemberIds.length === 0) continue;

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("*")
      .in("member_id", accountMemberIds);

    // Chaque destinataire reçoit le message dans SA langue du foyer concerné,
    // pas celle de la personne qui a déclenché l'action.
    const lang: Lang = (member.language as Lang) || "fr";
    const body = translateWithParams(lang, key, params || {});

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
        sent++;
      } catch (e: unknown) {
        const statusCode = (e as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("[send-notification] Web Push failed", {
            memberId: member.id,
            subscriptionId: sub.id,
            statusCode: statusCode ?? null,
            message: e instanceof Error ? e.message : "Unknown Web Push error",
          });
        }
      }
    }
  }

  return NextResponse.json({ sent });
}
