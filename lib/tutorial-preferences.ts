import type { SupabaseClient } from "@supabase/supabase-js";

export const TUTORIAL_EVENT = "dabo:tutorial-preference-changed";

export async function getTutorialEnabled(supabase: SupabaseClient): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return true;
  const { data, error } = await supabase
    .from("user_tutorial_preferences")
    .select("tutorial_enabled")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return true;
  return data?.tutorial_enabled !== false;
}

export async function setTutorialEnabled(supabase: SupabaseClient, enabled: boolean): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from("user_tutorial_preferences").upsert(
    { user_id: user.id, tutorial_enabled: enabled, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) throw error;
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(TUTORIAL_EVENT, { detail: { enabled } }));
}
