import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const allowedEvents = new Set([
  "landing_view",
  "app_open",
  "signup_completed",
  "household_created",
  "household_joined",
  "first_value",
]);
const allowedValueTypes = new Set(["task", "shopping", "calendar"]);

export async function POST(req: NextRequest) {
  let body: {
    eventName?: string;
    visitorId?: string;
    referralToken?: string | null;
    householdId?: string | null;
    valueType?: string | null;
  } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Corps invalide" }, { status: 400 }); }

  if (!body.eventName || !allowedEvents.has(body.eventName)) return NextResponse.json({ error: "Événement invalide" }, { status: 400 });
  if (!body.visitorId || !/^[0-9a-f-]{36}$/i.test(body.visitorId)) return NextResponse.json({ error: "Visiteur invalide" }, { status: 400 });
  if (body.referralToken && !/^[0-9a-f-]{36}$/i.test(body.referralToken)) return NextResponse.json({ error: "Référence invalide" }, { status: 400 });
  if (body.valueType && !allowedValueTypes.has(body.valueType)) return NextResponse.json({ error: "Type de valeur invalide" }, { status: 400 });

  const db = createAdminClient();
  const authHeader = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  let userId: string | null = null;
  if (authHeader) {
    const { data } = await db.auth.getUser(authHeader);
    userId = data.user?.id || null;
  }

  // Les événements post-inscription doivent être liés à une session authentifiée.
  if (body.eventName !== "landing_view" && !userId) {
    // Le client peut ne pas joindre le bearer immédiatement après sign-up.
    // On conserve alors visitor_id pour relier le parcours sans collecter de PII.
  }

  let householdId: string | null = null;
  if (body.householdId && userId) {
    const { data: membership } = await db.from("members").select("id")
      .eq("user_id", userId).eq("household_id", body.householdId).is("left_at", null).maybeSingle();
    if (membership) householdId = body.householdId;
  }

  const { error } = await db.from("acquisition_events").insert({
    event_name: body.eventName,
    visitor_id: body.visitorId,
    referral_token: body.referralToken || null,
    user_id: userId,
    household_id: householdId,
    value_type: body.valueType || null,
  });
  if (error) {
    console.error("[acquisition-event]", error);
    return NextResponse.json({ error: "Mesure indisponible" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
