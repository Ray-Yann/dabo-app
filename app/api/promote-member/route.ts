import { NextRequest, NextResponse } from "next/server";
import {
  createAdminClient,
  createUserClient,
  verifyUserToken,
} from "@/lib/supabase-admin";
import { sendEventNotification } from "@/lib/server-event-notifications";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userData = await verifyUserToken(token);
  if (!userData) {
    return NextResponse.json({ error: "Session invalide" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const memberId = typeof body.memberId === "string" ? body.memberId : "";

  if (!memberId) {
    return NextResponse.json({ error: "Membre manquant" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: target, error: targetError } = await admin
    .from("members")
    .select("id, household_id, role")
    .eq("id", memberId)
    .is("left_at", null)
    .not("user_id", "is", null)
    .maybeSingle();

  if (targetError) {
    return NextResponse.json({ error: targetError.message }, { status: 500 });
  }

  if (!target) {
    return NextResponse.json({ error: "Membre introuvable" }, { status: 404 });
  }

  const { data: caller, error: callerError } = await admin
    .from("members")
    .select("id, role")
    .eq("household_id", target.household_id)
    .eq("user_id", userData.id)
    .is("left_at", null)
    .maybeSingle();

  if (callerError) {
    return NextResponse.json({ error: callerError.message }, { status: 500 });
  }

  if (!caller || caller.role !== "creator") {
    return NextResponse.json(
      { error: "Action réservée au créateur du foyer" },
      { status: 403 }
    );
  }

  // Une répétition de la même action ne doit ni remuter le rôle,
  // ni produire une nouvelle notification.
  if (target.role === "creator") {
    return NextResponse.json({ success: true, alreadyCreator: true });
  }

  const userClient = createUserClient(token);
  const { error: promoteError } = await userClient.rpc(
    "promote_household_member_to_creator",
    { p_member_id: memberId }
  );

  if (promoteError) {
    return NextResponse.json({ error: promoteError.message }, { status: 400 });
  }

  try {
    await sendEventNotification({
      admin,
      householdId: target.household_id,
      excludeMemberId: caller.id,
      targetMemberIds: [memberId],
      key: "notif_creator_promoted",
      eventDeliveryKey: `creator_promoted:${target.household_id}:${memberId}`,
    });
  } catch (notificationError) {
    console.error("[promote-member] Creator notification failed", {
      memberId,
      householdId: target.household_id,
      error:
        notificationError instanceof Error
          ? notificationError.message
          : String(notificationError),
    });
  }

  return NextResponse.json({ success: true, alreadyCreator: false });
}
