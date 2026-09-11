import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET(
  _request: Request,
  context: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await context.params;
  const cookieStore = await cookies();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => undefined,
      },
    }
  );

  const { data: { user } } = await auth.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("members")
    .select("id, household_id, avatar_path, left_at")
    .eq("id", memberId)
    .maybeSingle();

  if (!target?.avatar_path || target.left_at) return new NextResponse(null, { status: 404 });

  // Une photo de profil n'est accessible qu'à un membre actif du même foyer.
  const { data: viewer } = await admin
    .from("members")
    .select("id")
    .eq("user_id", user.id)
    .eq("household_id", target.household_id)
    .is("left_at", null)
    .maybeSingle();

  if (!viewer) return new NextResponse(null, { status: 403 });

  const { data, error } = await admin.storage
    .from("member-avatars")
    .createSignedUrl(target.avatar_path, 60);

  if (error || !data?.signedUrl) return new NextResponse(null, { status: 404 });

  const response = NextResponse.redirect(data.signedUrl, 302);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
