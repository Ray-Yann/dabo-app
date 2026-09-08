import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, verifyUserToken } from "@/lib/supabase-admin";

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

  // IMPORTANT : on vérifie le bearer séparément du client service-role qui écrit.
  // Ainsi, un jeton utilisateur ne peut jamais faire perdre le bypass RLS au client admin.
  const authHeader = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const verifiedUser = authHeader ? await verifyUserToken(authHeader) : null;
  const userId = verifiedUser?.id || null;
  const db = createAdminClient();

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
    console.error("[acquisition-event] insert failed", {
      code: error.code,
      message: error.message,
      eventName: body.eventName,
      authenticated: Boolean(userId),
    });
    return NextResponse.json({ error: "Mesure indisponible" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
