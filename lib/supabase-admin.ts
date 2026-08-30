import { createClient } from "@supabase/supabase-js";

// Ce client utilise la clé secrète, réservée au serveur (jamais exposée au navigateur).
// Il sert uniquement à lire les abonnements de notification de tout le foyer,
// une opération que la sécurité normale (RLS) réserve à chaque membre pour lui-même.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
