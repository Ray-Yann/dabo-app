import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, transferCreatorAndArchive, verifyUserToken } from "@/lib/supabase-admin";
import { sendEventNotification } from "@/lib/server-event-notifications";

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
    .select("id, household_id, first_name")
    .eq("id", memberId)
    .eq("user_id", userData.id)
    .is("left_at", null)
    .maybeSingle();

  if (member) {
    try {
      const { promotedMemberId } = await transferCreatorAndArchive(admin, member.id);

      if (promotedMemberId) {
        try {
          await sendEventNotification({
            admin,
            householdId: member.household_id,
            excludeMemberId: member.id,
            targetMemberIds: [promotedMemberId],
            key: "notif_creator_promoted",
            eventDeliveryKey: `creator_promoted:${member.household_id}:${promotedMemberId}`,
          });
        } catch (notificationError) {
          console.error("[leave-household] Creator promotion notification failed", {
            memberId: promotedMemberId,
            householdId: member.household_id,
            error:
              notificationError instanceof Error
                ? notificationError.message
                : String(notificationError),
          });
        }
      }

      try {
        await sendEventNotification({
          admin,
          householdId: member.household_id,
          excludeMemberId: member.id,
          key: "notif_member_left",
          params: { name: member.first_name || "" },
        });
      } catch (notificationError) {
        console.error("[leave-household] Departure notification failed", {
          memberId: member.id,
          message:
            notificationError instanceof Error
              ? notificationError.message
              : "Unknown event notification error",
        });
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Impossible de quitter le foyer" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
