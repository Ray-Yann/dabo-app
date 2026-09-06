import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, transferCreatorAndArchive, verifyUserToken } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const userData = await verifyUserToken(token);
  if (!userData) return NextResponse.json({ error: "Session invalide" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  if (!memberId) return NextResponse.json({ error: "Membre invalide" }, { status: 400 });

  const admin = createAdminClient();

  const { data: caller } = await admin
    .from("members")
    .select("id, household_id, role")
    .eq("user_id", userData.id)
    .is("left_at", null)
    .maybeSingle();

  if (!caller || caller.role !== "creator") {
    return NextResponse.json({ error: "Action réservée au créateur du foyer" }, { status: 403 });
  }
  if (caller.id === memberId) {
    return NextResponse.json({ error: "Utilise « Quitter le foyer » pour ton propre départ" }, { status: 400 });
  }

  const { data: target } = await admin
    .from("members")
    .select("id")
    .eq("id", memberId)
    .eq("household_id", caller.household_id)
    .is("left_at", null)
    .maybeSingle();

  if (!target) return NextResponse.json({ error: "Membre actif introuvable" }, { status: 404 });

  try {
    await transferCreatorAndArchive(admin, target.id);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de retirer ce membre" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
