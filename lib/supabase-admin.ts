import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Ce client utilise la clé secrète, réservée au serveur (jamais exposée au navigateur).

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Utilisée à chaque fois qu'un membre part (quitte le foyer ou supprime son
// compte) : si cette personne était créatrice, le rôle passe automatiquement
// au membre le plus ancien restant, pour que le foyer garde toujours
// quelqu'un capable de gérer les membres. Sans ça, un foyer se retrouverait
// bloqué définitivement si le créateur partait.
export async function transferCreatorAndRemove(admin: SupabaseClient, memberId: string) {
  const { data: member } = await admin
    .from("members")
    .select("id, household_id, role")
    .eq("id", memberId)
    .maybeSingle();

  if (member?.role === "creator") {
    const { data: nextInLine } = await admin
      .from("members")
      .select("id")
      .eq("household_id", member.household_id)
      .neq("id", memberId)
      .order("created_at", { ascending: true })
      .limit(1);

    if (nextInLine && nextInLine.length > 0) {
      await admin.from("members").update({ role: "creator" }).eq("id", nextInLine[0].id);
    }
  }

  await admin.from("members").delete().eq("id", memberId);
}
