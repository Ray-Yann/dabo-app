import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, verifyUserToken } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type ShareMethod = "native" | "clipboard";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const user = await verifyUserToken(token);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  let body: { method?: ShareMethod; householdId?: string | null; referralToken?: string | null } = {};
  try { body = await req.json(); } catch { /* corps vide/invalide */ }
  if (body.method !== "native" && body.method !== "clipboard") {
    return NextResponse.json({ error: "Méthode de partage invalide" }, { status: 400 });
  }

  if (body.referralToken && !/^[0-9a-f-]{36}$/i.test(body.referralToken)) {
    return NextResponse.json({ error: "Référence de partage invalide" }, { status: 400 });
  }

  const db = createAdminClient();
  let householdId: string | null = null;
  if (body.householdId) {
    const { data: membership } = await db.from("members").select("id").eq("user_id", user.id).eq("household_id", body.householdId).is("left_at", null).maybeSingle();
    if (membership) householdId = body.householdId;
  }

  const { error } = await db.from("app_share_events").insert({
    user_id: user.id,
    household_id: householdId,
    method: body.method,
    referral_token: body.referralToken || null,
  });
  if (error) {
    console.error("[share-app] insert failed", { code: error.code, message: error.message, authenticated: true });
    return NextResponse.json({ error: "Partage effectué, mais mesure indisponible" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
