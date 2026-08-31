import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, transferCreatorAndRemove } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const authClient = createAdminClient();
  const { data: userData, error: userErr } = await authClient.auth.getUser(token);
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "Session invalide" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: member } = await admin
    .from("members")
    .select("id")
    .eq("user_id", userData.user.id)
    .limit(1);

  if (member && member.length > 0) {
    await transferCreatorAndRemove(admin, member[0].id);
  }

  return NextResponse.json({ success: true });
}
