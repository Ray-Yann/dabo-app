import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, verifyUserToken } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userData = await verifyUserToken(token);
  if (!userData) {
    return NextResponse.json({ error: "Session invalide" }, { status: 401 });
  }

  const admin = createAdminClient();
  const userId = userData.id;

  const { data: authUserData, error: authUserError } =
    await admin.auth.admin.getUserById(userId);

  if (authUserError) {
    console.error("DABO portability auth export failed", authUserError);
    return NextResponse.json({ error: "Impossible de préparer l'export" }, { status: 500 });
  }

  const { data: memberships, error: membershipsError } = await admin
    .from("members")
    .select("id, household_id, first_name, role, avatar_color, avatar_emoji, created_at, left_at")
    .eq("user_id", userId);

  if (membershipsError) {
    return NextResponse.json({ error: "Impossible de préparer l'export" }, { status: 500 });
  }

  const activeMemberships = (memberships || []).filter((membership) => !membership.left_at);
  const memberIds = activeMemberships.map((membership) => membership.id);
  const householdIds = [...new Set(activeMemberships.map((membership) => membership.household_id))];

  const [
    householdsResult,
    navigationResult,
    tutorialResult,
    lifeContextsResult,
    perceptionsResult,
    personalEventsResult,
  ] = await Promise.all([
    householdIds.length
      ? admin
          .from("households")
          .select("id, name, household_type, country_code, created_at")
          .in("id", householdIds)
      : Promise.resolve({ data: [], error: null }),
    admin
      .from("user_navigation_preferences")
      .select("pinned_tabs, updated_at")
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("user_tutorial_preferences")
      .select("tutorial_enabled, updated_at")
      .eq("user_id", userId)
      .maybeSingle(),
    memberIds.length
      ? admin
          .from("member_life_contexts")
          .select("id, household_id, member_id, context_type, impact, starts_on, ends_on, created_at, updated_at")
          .in("member_id", memberIds)
      : Promise.resolve({ data: [], error: null }),
    memberIds.length
      ? admin
          .from("member_load_perceptions")
          .select("id, household_id, member_id, perception, declared_at, created_at")
          .in("member_id", memberIds)
      : Promise.resolve({ data: [], error: null }),
    memberIds.length
      ? admin
          .from("calendar_events")
          .select("id, household_id, title, event_date, event_time, recurring, recurrence_type, recurrence_interval, recurrence_days, recurrence_end_date, reminder_days_before, time_zone, created_at")
          .eq("visibility", "personal")
          .in("private_owner_id", memberIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const queryError =
    householdsResult.error ||
    navigationResult.error ||
    tutorialResult.error ||
    lifeContextsResult.error ||
    perceptionsResult.error ||
    personalEventsResult.error;

  if (queryError) {
    console.error("DABO portability export failed", queryError);
    return NextResponse.json({ error: "Impossible de préparer l'export" }, { status: 500 });
  }

  const exportedAt = new Date().toISOString();

  const payload = {
    format: "dabo-portability-v1",
    exportedAt,
    account: {
      id: userId,
      email: authUserData.user?.email ?? null,
    },
    households: activeMemberships.map((membership) => {
      const household = (householdsResult.data || []).find(
        (item) => item.id === membership.household_id
      );

      return {
        membership: {
          id: membership.id,
          firstName: membership.first_name,
          role: membership.role,
          avatarColor: membership.avatar_color,
          avatarEmoji: membership.avatar_emoji,
          joinedAt: membership.created_at,
        },
        household: household
          ? {
              id: household.id,
              name: household.name,
              type: household.household_type,
              countryCode: household.country_code,
              createdAt: household.created_at,
            }
          : null,
      };
    }),
    personalData: {
      navigationPreferences: navigationResult.data ?? null,
      tutorialPreferences: tutorialResult.data ?? null,
      lifeContexts: lifeContextsResult.data || [],
      loadPerceptions: perceptionsResult.data || [],
      personalCalendarEvents: personalEventsResult.data || [],
    },
  };

  const date = exportedAt.slice(0, 10);

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="dabo-data-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
