import { createAdminClient, verifyUserToken } from "@/lib/supabase-admin";

export async function requireDaboAdmin(token: string) {
  const user = await verifyUserToken(token);
  if (!user) return null;
  const allowed = (process.env.DABO_ADMIN_EMAILS || "")
    .split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
  if (!allowed.length) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(user.id);
  if (error || !data.user?.email || !allowed.includes(data.user.email.toLowerCase())) return null;
  return { id: user.id, email: data.user.email };
}
