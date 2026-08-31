import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase-admin";

webpush.setVapidDetails(
  "mailto:contact@dabo.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Appelée automatiquement chaque jour par Vercel Cron — voir vercel.json.
// Principe non négociable du produit : le rappel part UNIQUEMENT à la personne
// assignée à la tâche, jamais aux autres membres du foyer — ce n'est pas un
// signalement de retard public, juste une aide personnelle.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, name, assigned_to, due_date")
    .eq("status", "pending")
    .not("assigned_to", "is", null)
    .lte("due_date", today);

  if (!tasks || tasks.length === 0) return NextResponse.json({ sent: 0 });

  // Regroupe les tâches par personne, pour n'envoyer qu'une seule notification
  // par personne même si elle a plusieurs tâches dues aujourd'hui.
  const byMember = new Map<string, string[]>();
  for (const t of tasks) {
    if (!t.assigned_to) continue;
    const list = byMember.get(t.assigned_to) || [];
    list.push(t.name);
    byMember.set(t.assigned_to, list);
  }

  let sent = 0;
  for (const [memberId, names] of byMember.entries()) {
    const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("member_id", memberId);
    const body = names.length === 1 ? names[0] : `${names.length} tâches, dont ${names[0]}`;
    for (const sub of subs || []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: "Dabo — Rappel", body })
        );
        sent++;
      } catch {
        // Abonnement expiré ou invalide — ne bloque pas les autres envois.
      }
    }
  }

  return NextResponse.json({ sent });
}
