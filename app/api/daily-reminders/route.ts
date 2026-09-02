import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase-admin";
import { translate, translateWithParams, Lang } from "@/lib/i18n";
import { nextOccurrence, daysUntil } from "@/lib/utils";

webpush.setVapidDetails(
  "mailto:contact@dabo.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Appelée automatiquement chaque jour par Vercel Cron — voir vercel.json.
// Couvre les tâches ET les articles de courses ayant une échéance.
// Principe non négociable du produit : le rappel part UNIQUEMENT à la personne
// assignée, jamais aux autres membres du foyer — ce n'est pas un signalement
// de retard public, juste une aide personnelle.
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

  const { data: items } = await supabase
    .from("shopping_items")
    .select("id, name, assigned_to, due_date")
    .eq("status", "to_buy")
    .not("assigned_to", "is", null)
    .lte("due_date", today);

  const allDue = [...(tasks || []), ...(items || [])];

  // Regroupe tâches et courses par personne, pour n'envoyer qu'une seule
  // notification par personne même si plusieurs éléments sont dus aujourd'hui.
  const byMember = new Map<string, string[]>();
  for (const t of allDue) {
    if (!t.assigned_to) continue;
    const list = byMember.get(t.assigned_to) || [];
    list.push(t.name);
    byMember.set(t.assigned_to, list);
  }

  let sent = 0;
  for (const [memberId, names] of byMember.entries()) {
    const { data: memberRow } = await supabase.from("members").select("language").eq("id", memberId).maybeSingle();
    const lang: Lang = (memberRow?.language as Lang) || "fr";
    const title = translate(lang, "notif_reminder_title");
    const body = names.length === 1 ? names[0] : translateWithParams(lang, "notif_reminder_multiple", { count: String(names.length), first: names[0] });

    const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("member_id", memberId);
    for (const sub of subs || []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body })
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

  // Événements du calendrier : rappel 7 jours avant et le jour même,
  // envoyé à TOUT le foyer (pas une seule personne assignée), chacun dans
  // sa propre langue.
  const { data: allEvents } = await supabase.from("calendar_events").select("id, household_id, title, event_date, recurring, reminder_days_before");
  const householdsToNotify = new Map<string, string[]>();
  for (const ev of allEvents || []) {
    const days = daysUntil(nextOccurrence(ev.event_date, ev.recurring));
    if (days === 0 || days === ev.reminder_days_before) {
      const list = householdsToNotify.get(ev.household_id) || [];
      list.push(ev.title);
      householdsToNotify.set(ev.household_id, list);
    }
  }

  for (const [householdId, titles] of householdsToNotify.entries()) {
    const { data: householdMembers } = await supabase.from("members").select("id, language").eq("household_id", householdId);
    for (const member of householdMembers || []) {
      const lang: Lang = (member.language as Lang) || "fr";
      const body = titles.length === 1
        ? translateWithParams(lang, "notif_event_single", { title: titles[0] })
        : translateWithParams(lang, "notif_event_multiple", { count: String(titles.length), first: titles[0] });
      const title = translate(lang, "notif_reminder_title");

      const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("member_id", member.id);
      for (const sub of subs || []) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title, body })
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
  }

  return NextResponse.json({ sent });
}
