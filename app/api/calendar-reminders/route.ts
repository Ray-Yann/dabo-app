import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase-admin";
import { occurrenceOnOrAfter } from "@/lib/calendar-recurrence";
import type { CalendarEvent } from "@/lib/types";

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("Configuration VAPID manquante");
  webpush.setVapidDetails("mailto:contact@dabo.app", publicKey, privateKey);
}

function localParts(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value || "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

function addCivilDays(iso: string, days: number) {
  const [y,m,d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y,m-1,d + days));
  return date.toISOString().slice(0,10);
}

function civilNoon(iso: string) { return new Date(`${iso}T12:00:00Z`); }
function occurrenceIso(event: CalendarEvent, onOrAfter: string) {
  const out = occurrenceOnOrAfter(event, civilNoon(onOrAfter));
  if (!out) return null;
  return `${out.getFullYear()}-${String(out.getMonth()+1).padStart(2,"0")}-${String(out.getDate()).padStart(2,"0")}`;
}

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Non autorisÃ©" }, { status: 401 });
  try { configureWebPush(); } catch { return NextResponse.json({ error: "Configuration push indisponible" }, { status: 503 }); }

  const db = createAdminClient();
  const now = new Date();
  const { data: events, error } = await db.from("calendar_events")
    .select("id,household_id,created_by,title,event_date,recurring,recurrence_frequency,recurrence_interval,recurrence_end_date,event_time,time_zone,all_day,event_kind,reminder_days_before,visibility,private_owner_id,created_at")
    .not("event_time", "is", null);
  if (error) return NextResponse.json({ error: "Lecture calendrier impossible" }, { status: 500 });

  let sent = 0, due = 0;
  for (const raw of events || []) {
    const event = raw as CalendarEvent;
    const tz = event.time_zone || "Europe/Brussels";
    let local;
    try { local = localParts(now, tz); } catch { local = localParts(now, "UTC"); }
    if (local.time !== event.event_time?.slice(0,5)) continue;

    const targetOccurrenceDate = addCivilDays(local.date, Math.max(0, event.reminder_days_before || 0));
    if (occurrenceIso(event, targetOccurrenceDate) !== targetOccurrenceDate) continue;
    due++;

    let memberIds: string[] = [];
    if (event.visibility === "personal") {
      if (event.private_owner_id) memberIds = [event.private_owner_id];
    } else {
      const { data: members } = await db.from("members").select("id").eq("household_id", event.household_id).is("left_at", null).not("user_id", "is", null);
      memberIds = (members || []).map((m) => m.id);
    }

    for (const memberId of memberIds) {
      const { error: claimError } = await db.from("calendar_reminder_deliveries").insert({
        event_id: event.id, member_id: memberId, occurrence_date: targetOccurrenceDate, reminder_days_before: event.reminder_days_before || 0,
      });
      if (claimError) { if (claimError.code === "23505") continue; else continue; }

      const { data: subs } = await db.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("member_id", memberId);
      let delivered = false;
      for (const sub of subs || []) {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title: "Dabo â€” Rappel", body: event.title, url: "/app/calendrier" }));
          sent++; delivered = true;
        } catch (e: unknown) {
          const pushError = e as { statusCode?: number; message?: string; body?: string };
          const status = pushError.statusCode;
          console.error("[calendar-reminders] Web Push failed", { eventId: event.id, memberId, subscriptionId: sub.id, statusCode: status ?? null, message: pushError.message ?? null, body: pushError.body ?? null });
          if (status === 404 || status === 410) await db.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
      if (!delivered) await db.from("calendar_reminder_deliveries").delete().eq("event_id", event.id).eq("member_id", memberId).eq("occurrence_date", targetOccurrenceDate).eq("reminder_days_before", event.reminder_days_before || 0);
    }
  }
  return NextResponse.json({ ok: true, due, sent, checked_at: now.toISOString() });
}

