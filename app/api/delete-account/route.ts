import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, transferCreatorAndRemove } from "@/lib/supabase-admin";

// Supprime définitivement le compte de la personne qui fait la demande.
// L'identité est vérifiée ici, côté serveur, à partir du jeton envoyé —
// jamais à partir d'un identifiant fourni directement par le client,
// pour qu'il soit impossible de supprimer le compte de quelqu'un d'autre.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "Session invalide" }, { status: 401 });
  }

  const userId = userData.user.id;

  // Retire la personne de tout foyer dont elle est membre, en transmettant
  // d'abord le rôle de créateur si nécessaire (voir transferCreatorAndRemove).
  // Les tâches et courses qui lui étaient assignées repassent automatiquement
  // en "non assigné", ses commentaires sont supprimés avec elle.
  const { data: memberships } = await admin.from("members").select("id").eq("user_id", userId);
  for (const m of memberships || []) {
    await transferCreatorAndRemove(admin, m.id);
  }

  // Supprime le compte d'authentification lui-même — email, mot de passe,
  // tout. Cette action est irréversible.
  const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
