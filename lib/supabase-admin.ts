import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Ce client utilise la clé secrète, réservée au serveur (jamais exposée au navigateur).

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Vérifie un jeton utilisateur par une requête directe, sans passer par un
// client Supabase — pour qu'il n'y ait absolument aucun risque que cette
// vérification fasse perdre ses pleins pouvoirs au client admin utilisé
// ensuite pour les requêtes en base de données (piège documenté par Supabase :
// un client secret key perd le bypass RLS dès qu'un jeton utilisateur entre
// en jeu, même sur un client séparé de la même bibliothèque).
export async function verifyUserToken(token: string): Promise<{ id: string } | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.id ? { id: data.id } : null;
  } catch {
    return null;
  }
}

// Utilisée à chaque fois qu'un membre part (quitte le foyer ou supprime son
// compte) : si cette personne était créatrice, le rôle passe automatiquement
// au membre le plus ancien restant, pour que le foyer garde toujours
// quelqu'un capable de gérer les membres. Sans ça, un foyer se retrouverait
// bloqué définitivement si le créateur partait.
export async function transferCreatorAndArchive(admin: SupabaseClient, memberId: string) {
  const { data: member, error: memberError } = await admin
    .from("members")
    .select("id, household_id, role, avatar_color, left_at")
    .eq("id", memberId)
    .maybeSingle();

  if (memberError) throw memberError;
  if (!member || member.left_at) return;

  if (member.role === "creator") {
    const { data: nextInLine, error: nextError } = await admin
      .from("members")
      .select("id")
      .eq("household_id", member.household_id)
      .neq("id", memberId)
      .is("left_at", null)
      .not("user_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(1);

    if (nextError) throw nextError;
    if (nextInLine && nextInLine.length > 0) {
      const { error: promoteError } = await admin
        .from("members")
        .update({ role: "creator" })
        .eq("id", nextInLine[0].id);
      if (promoteError) throw promoteError;
    }
  }

  // Une personne partie ne doit plus rester assignée à du travail futur.
  const { error: taskError } = await admin
    .from("tasks")
    .update({ assigned_to: null })
    .eq("assigned_to", memberId)
    .eq("status", "pending");
  if (taskError) throw taskError;

  const { error: shoppingError } = await admin
    .from("shopping_items")
    .update({ assigned_to: null })
    .eq("assigned_to", memberId)
    .eq("status", "to_buy");
  if (shoppingError) throw shoppingError;

  const { error: rotationError } = await admin
    .from("routines")
    .update({ last_assigned_member: null })
    .eq("last_assigned_member", memberId);
  if (rotationError) throw rotationError;

  const { error: archiveError } = await admin
    .from("members")
    .update({
      left_at: new Date().toISOString(),
      archived_avatar_color: member.avatar_color,
      user_id: null,
      role: "member",
    })
    .eq("id", memberId);
  if (archiveError) throw archiveError;
}
