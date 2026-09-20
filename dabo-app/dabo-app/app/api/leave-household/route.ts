import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, transferCreatorAndArchive, verifyUserToken } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const userData = await verifyUserToken(token);
  if (!userData) {
    return NextResponse.json({ error: "Session invalide" }, { status: 401 });
  }

  const admin = createAdminClient();

  const body = await req.json().catch(() => ({}));
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  if (!memberId) return NextResponse.json({ error: "Foyer invalide" }, { status: 400 });

  const { data: member } = await admin
    .from("members")
    .select("id")
    .eq("id", memberId)
    .eq("user_id", userData.id)
    .is("left_at", null)
    .maybeSingle();

  if (member) {
    try {
      await transferCreatorAndArchive(admin, member.id);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Impossible de quitter le foyer" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
