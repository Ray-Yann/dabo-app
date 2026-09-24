import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, transferCreatorAndArchive, verifyUserToken } from "@/lib/supabase-admin";
import { sendEventNotification } from "@/lib/server-event-notifications";

// Supprime définitivement le compte de la personne qui fait la demande.
// L'identité est vérifiée ici, côté serveur, à partir du jeton envoyé —
// jamais à partir d'un identifiant fourni directement par le client,
// pour qu'il soit impossible de supprimer le compte de quelqu'un d'autre.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const userData = await verifyUserToken(token);
  if (!userData) {
    return NextResponse.json({ error: "Session invalide" }, { status: 401 });
  }

  const userId = userData.id;

  const admin = createAdminClient();

  // Retire la personne de tout foyer dont elle est membre, en transmettant
  // d'abord le rôle de créateur si nécessaire (voir transferCreatorAndArchive).
  // Les tâches et courses qui lui étaient assignées repassent automatiquement
  // en "non assigné", ses commentaires sont supprimés avec elle.
  const { data: memberships } = await admin
    .from("members")
    .select("id, household_id")
    .eq("user_id", userId);
  for (const m of memberships || []) {
    try {
      const { promotedMemberId } = await transferCreatorAndArchive(admin, m.id);

      if (promotedMemberId) {
        try {
          await sendEventNotification({
            admin,
            householdId: m.household_id,
            excludeMemberId: m.id,
            targetMemberIds: [promotedMemberId],
            key: "notif_creator_promoted",
            eventDeliveryKey: `creator_promoted:${m.household_id}:${promotedMemberId}`,
          });
        } catch (notificationError) {
          console.error("[delete-account] Creator promotion notification failed", {
            memberId: promotedMemberId,
            householdId: m.household_id,
            error:
              notificationError instanceof Error
                ? notificationError.message
                : String(notificationError),
          });
        }
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Impossible d'archiver l'historique du membre" },
        { status: 500 }
      );
    }
  }

  // Supprime le compte d'authentification lui-même — email, mot de passe,
  // tout. Cette action est irréversible.
  const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
