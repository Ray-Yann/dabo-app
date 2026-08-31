import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase-admin";

webpush.setVapidDetails(
  "mailto:contact@dabo.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
  const { householdId, excludeMemberId, title, body } = await req.json();
  if (!householdId || !title) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: members } = await supabase
    .from("members")
    .select("id")
    .eq("household_id", householdId)
    .neq("id", excludeMemberId || "");

  const memberIds = (members || []).map((m) => m.id);
  if (memberIds.length === 0) return NextResponse.json({ sent: 0 });

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in("member_id", memberIds);

  let sent = 0;
  for (const sub of subs || []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({ title, body })
      );
      sent++;
    } catch (e: unknown) {
      const statusCode = (e as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        // Abonnement mort (téléphone changé, app désinstallée) — on le retire
        // pour ne pas continuer à essayer de le contacter indéfiniment.
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }

  return NextResponse.json({ sent });
}
