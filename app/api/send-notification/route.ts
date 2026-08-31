import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase-admin";
import { translateWithParams, Lang } from "@/lib/i18n";

webpush.setVapidDetails(
  "mailto:contact@dabo.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
  const { householdId, excludeMemberId, key, params } = await req.json();
  if (!householdId || !key) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: members } = await supabase
    .from("members")
    .select("id, language")
    .eq("household_id", householdId)
    .neq("id", excludeMemberId || "");

  if (!members || members.length === 0) return NextResponse.json({ sent: 0 });

  let sent = 0;
  for (const member of members) {
    const { data: subs } = await supabase
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
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }
  }

  return NextResponse.json({ sent });
}
