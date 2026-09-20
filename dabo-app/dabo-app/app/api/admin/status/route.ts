import { NextRequest, NextResponse } from "next/server";
import { requireDaboAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const admin = await requireDaboAdmin(token);

  return NextResponse.json({ isAdmin: Boolean(admin) });
}
