import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase-admin";
import { translateWithParams, Lang } from "@/lib/i18n";

webpush.setVapidDetails(
  "mailto:contact@dabo.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Seules ces clés peuvent déclencher une notification — empêche quiconque
// d'injecter un texte arbitraire dans une notification, même en cas de jeton
// valide détourné.
const ALLOWED_KEYS = ["notif_item_bought", "notif_task_done"];

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { householdId, excludeMemberId, key, params } = await req.json();
  if (!householdId || !key) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }
  if (!ALLOWED_KEYS.includes(key)) {
    return NextResponse.json({ error: "Message non autorisé" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "Session invalide" }, { status: 401 });
  }

  // Vérifie que la personne qui déclenche la notification est bien elle-même
  // membre de ce foyer précis — jamais de foyer arbitraire fourni par le client.
  const { data: callerMember, error: callerErr } = await admin
    .from("members")
    .select("id")
    .eq("id", excludeMemberId)
    .eq("household_id", householdId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!callerMember) {
    const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    console.error("send-notification: échec de vérification", {
      householdId,
      excludeMemberId,
      userId: userData.user.id,
      callerErr,
      keyPreview: rawKey.slice(0, 15),
      keyLength: rawKey.length,
    });
    return NextResponse.json(
      {
        error: "Non autorisé pour ce foyer",
        debug: callerErr?.message || null,
        householdId,
        excludeMemberId,
        userId: userData.user.id,
        keyPreview: rawKey.slice(0, 15),
        keyLength: rawKey.length,
      },
      { status: 403 }
    );
  }

  const { data: members } = await admin
    .from("members")
    .select("id, language")
    .eq("household_id", householdId)
    .neq("id", excludeMemberId || "");

  if (!members || members.length === 0) return NextResponse.json({ sent: 0 });

  let sent = 0;
  for (const member of members) {
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("*")
      .eq("member_id", member.id);

    // Chaque destinataire reçoit le message dans SA propre langue,
    // pas celle de la personne qui a déclenché l'action.
    const lang: Lang = (member.language as Lang) || "fr";
    const body = translateWithParams(lang, key, params || {});

    for (const sub of subs || []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({ title: "Dabo", body })
        );
        sent++;
      } catch (e: unknown) {
        const statusCode = (e as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }
  }

  return NextResponse.json({ sent });
}
