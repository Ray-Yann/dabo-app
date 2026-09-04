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

  const { data: member } = await admin
    .from("members")
    .select("id")
    .eq("user_id", userData.id)
    .limit(1);

  if (member && member.length > 0) {
    try {
      await transferCreatorAndArchive(admin, member[0].id);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Impossible de quitter le foyer" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
