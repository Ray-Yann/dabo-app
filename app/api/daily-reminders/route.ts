import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase-admin";
import { translate, translateWithParams, Lang } from "@/lib/i18n";
import { nextOccurrence, daysUntil } from "@/lib/utils";
import {
  billNotificationCandidate,
  buildDailyDigest,
  eventNotificationCandidate,
  NotificationCandidate,
  taskNotificationCandidate,
} from "@/lib/notification-policy";

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("Configuration VAPID manquante");
  webpush.setVapidDetails("mailto:contact@dabo.app", publicKey, privateKey);
}

function langOf(value: unknown): Lang {
  return (["fr", "nl", "en", "de", "es", "it", "pt"] as const).includes(value as Lang)
    ? (value as Lang)
    : "fr";
}

// Notifications V2 : un seul digest quotidien maximum par membre.
// La Home peut montrer davantage d'informations que le Push : ici on ne garde
// que les échéances réellement actionnables (tâches, calendrier, factures).
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    configureWebPush();
  } catch {
    return NextResponse.json({ error: "Configuration des notifications indisponible" }, { status: 503 });
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: members } = await supabase
    .from("members")
    .select("id, household_id, language")
    .is("left_at", null)
    .not("user_id", "is", null);

  const activeMembers = members || [];
  const memberById = new Map(activeMembers.map((m) => [m.id, m]));
  const membersByHousehold = new Map<string, typeof activeMembers>();
  for (const member of activeMembers) {
    const list = membersByHousehold.get(member.household_id) || [];
    list.push(member);
    membersByHousehold.set(member.household_id, list);
  }

  const candidatesByMember = new Map<string, NotificationCandidate[]>();
  const add = (memberId: string, candidate: NotificationCandidate | null) => {
    if (!candidate || !memberById.has(memberId)) return;
    const list = candidatesByMember.get(memberId) || [];
    list.push(candidate);
    candidatesByMember.set(memberId, list);
  };

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, name, assigned_to, due_date")
    .eq("status", "pending")
    .not("assigned_to", "is", null)
    .lte("due_date", today);

  for (const task of tasks || []) {
    if (!task.assigned_to) continue;
    add(task.assigned_to, taskNotificationCandidate({
      id: task.id,
      name: task.name,
      dueDate: task.due_date,
      today,
    }));
  }

  const { data: bills } = await supabase
    .from("finance_bills")
    .select("id, household_id, label, due_on, visibility, private_owner_member_id")
    .eq("status", "pending")
    .lte("due_on", new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10));

  for (const bill of bills || []) {
    const candidate = billNotificationCandidate({
      id: bill.id,
      label: bill.label,
      dueOn: bill.due_on,
      today,
    });
    if (!candidate) continue;

    if (bill.visibility === "private") {
      if (bill.private_owner_member_id) add(bill.private_owner_member_id, candidate);
      continue;
    }
    for (const member of membersByHousehold.get(bill.household_id) || []) add(member.id, candidate);
  }

  const { data: events } = await supabase
    .from("calendar_events")
    .select("id, household_id, title, event_date, recurring, reminder_days_before, visibility, private_owner_id");

  for (const event of events || []) {
    const until = daysUntil(nextOccurrence(event.event_date, event.recurring));
    const candidate = eventNotificationCandidate({
      id: event.id,
      title: event.title,
      daysUntilOccurrence: until,
      reminderDaysBefore: event.reminder_days_before,
    });
    if (!candidate) continue;

    if (event.visibility === "personal") {
      if (event.private_owner_id) add(event.private_owner_id, candidate);
      continue;
    }
    for (const member of membersByHousehold.get(event.household_id) || []) add(member.id, candidate);
  }

  let sent = 0;
  let digests = 0;

  for (const [memberId, candidates] of candidatesByMember.entries()) {
    const digest = buildDailyDigest(candidates);
    if (!digest) continue;

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("member_id", memberId);
    if (!subs?.length) continue;

    // La ligne unique sert de verrou anti-doublon, y compris si Vercel rejoue le Cron.
    const { error: claimError } = await supabase.from("notification_deliveries").insert({
      member_id: memberId,
      delivery_date: today,
      digest_key: digest.candidateIds.join("|"),
    });
    if (claimError) {
      if (claimError.code === "23505") continue;
      console.error("notification claim failed", claimError.code);
      continue;
    }

    const member = memberById.get(memberId)!;
    const lang = langOf(member.language);
    const title = translate(lang, "notif_digest_title");
    const body = digest.count === 1
      ? translateWithParams(lang, digest.first.messageKey, digest.first.params)
      : translateWithParams(lang, "notif_digest_multiple", {
          count: String(digest.count),
          first: digest.first.label,
        });

    let deliveredForMember = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, url: digest.url })
        );
        sent++;
        deliveredForMember++;
      } catch (e: unknown) {
        const statusCode = (e as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    if (deliveredForMember === 0) {
      await supabase
        .from("notification_deliveries")
        .delete()
        .eq("member_id", memberId)
        .eq("delivery_date", today);
    } else {
      digests++;
    }
  }

  return NextResponse.json({ sent, digests });
}
