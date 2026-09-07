import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { requireDaboAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const isoAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
const maxIso = (values: (string | null | undefined)[]) =>
  values.filter((value): value is string => Boolean(value)).sort().at(-1) || null;

function displayNameFromAuthUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}) {
  const metadata = user.user_metadata || {};
  const candidates = [
    metadata.first_name,
    metadata.firstName,
    metadata.full_name,
    metadata.fullName,
    metadata.name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }

  const emailPrefix = user.email?.split("@")[0]?.trim();
  return emailPrefix || "Utilisateur DABO";
}

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const currentAdmin = await requireDaboAdmin(token);

  if (!currentAdmin) {
    return NextResponse.json({ error: "Accès administrateur refusé" }, { status: 403 });
  }

  const db = createAdminClient();
  const since7 = isoAgo(7);
  const since30 = isoAgo(30);

  // Les données essentielles du back-office sont chargées ensemble.
  // Un futur KPI optionnel ne doit jamais pouvoir faire tomber tout l'Admin.
  const [households, members, tasks, shopping, events, contributions, auth] = await Promise.all([
    db.from("households").select("id,name,created_at").order("created_at", { ascending: false }),
    db.from("members").select("id,user_id,household_id,first_name,role,created_at,left_at"),
    db.from("tasks").select("id,household_id,status,created_at,completed_at"),
    db.from("shopping_items").select("id,household_id,status,created_at,bought_at"),
    db.from("calendar_events").select("id,household_id,created_at"),
    db.from("task_contributions").select("id,household_id,completed_at,cancelled_at"),
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const coreErrors = [
    households.error,
    members.error,
    tasks.error,
    shopping.error,
    events.error,
    contributions.error,
    auth.error,
  ].filter(Boolean);

  if (coreErrors.length) {
    console.error("[admin/dashboard] Core data error", coreErrors);
    return NextResponse.json(
      { error: "Impossible de charger les données administrateur" },
      { status: 500 },
    );
  }

  // KPI « Faire connaître DABO » : isolé volontairement.
  // Si la table ou la requête rencontre un souci, le reste du cockpit reste utilisable.
  let shareRows: { id: string; user_id: string; household_id: string | null; method: string; created_at: string }[] = [];
  let sharingAvailable = true;

  try {
    const shares = await db
      .from("app_share_events")
      .select("id,user_id,household_id,method,created_at");

    if (shares.error) {
      sharingAvailable = false;
      console.error("[admin/dashboard] Sharing KPI unavailable", shares.error);
    } else {
      shareRows = shares.data || [];
    }
  } catch (error) {
    sharingAvailable = false;
    console.error("[admin/dashboard] Sharing KPI failed", error);
  }

  const H = households.data || [];
  const M = members.data || [];
  const T = tasks.data || [];
  const S = shopping.data || [];
  const E = events.data || [];
  const C = contributions.data || [];
  const SH = shareRows;
  const authUsers = auth.data?.users || [];

  const active = M.filter((member) => !member.left_at && member.user_id);
  const multi = new Map<string, number>();
  active.forEach((member) => {
    multi.set(member.user_id!, (multi.get(member.user_id!) || 0) + 1);
  });

  const activityHouseholds = (since: string) =>
    new Set([
      ...T.filter((item) => item.created_at >= since || (item.completed_at && item.completed_at >= since)).map(
        (item) => item.household_id,
      ),
      ...S.filter((item) => item.created_at >= since || (item.bought_at && item.bought_at >= since)).map(
        (item) => item.household_id,
      ),
      ...E.filter((item) => item.created_at >= since).map((item) => item.household_id),
      ...C.filter((item) => !item.cancelled_at && item.completed_at >= since).map((item) => item.household_id),
    ]).size;

  const authMap = new Map(authUsers.map((user) => [user.id, user]));
  const householdMap = new Map(H.map((household) => [household.id, household]));

  // Tous les comptes Supabase Auth apparaissent dans l'Admin, même sans foyer.
  // Cela rend « Utilisateurs » exact et permet d'identifier les abandons avant activation.
  const users = authUsers
    .map((user) => {
      const memberships = active.filter((member) => member.user_id === user.id);
      const householdIds = memberships.map((member) => member.household_id);
      const lastActivity = householdIds.length
        ? maxIso([
            ...T.filter((item) => householdIds.includes(item.household_id)).flatMap((item) => [
              item.created_at,
              item.completed_at,
            ]),
            ...S.filter((item) => householdIds.includes(item.household_id)).flatMap((item) => [
              item.created_at,
              item.bought_at,
            ]),
            ...E.filter((item) => householdIds.includes(item.household_id)).map((item) => item.created_at),
            ...C.filter(
              (item) => householdIds.includes(item.household_id) && !item.cancelled_at,
            ).map((item) => item.completed_at),
          ])
        : null;

      return {
        id: user.id,
        email: user.email || null,
        firstName: memberships[0]?.first_name || displayNameFromAuthUser(user),
        joinedAt: user.created_at,
        lastSignInAt: user.last_sign_in_at || null,
        lastActivity,
        households: memberships.map((member) => ({
          id: member.household_id,
          name: householdMap.get(member.household_id)?.name || "Foyer",
          role: member.role,
        })),
      };
    })
    .sort((a, b) => (b.joinedAt || "").localeCompare(a.joinedAt || ""));

  const householdActivity = (id: string) =>
    maxIso([
      ...T.filter((item) => item.household_id === id).flatMap((item) => [item.created_at, item.completed_at]),
      ...S.filter((item) => item.household_id === id).flatMap((item) => [item.created_at, item.bought_at]),
      ...E.filter((item) => item.household_id === id).map((item) => item.created_at),
      ...C.filter((item) => item.household_id === id && !item.cancelled_at).map((item) => item.completed_at),
    ]);

  const householdDetails = H.map((household) => ({
    id: household.id,
    name: household.name,
    createdAt: household.created_at,
    lastActivity: householdActivity(household.id),
    members: active
      .filter((member) => member.household_id === household.id)
      .map((member) => ({
        id: member.id,
        userId: member.user_id,
        firstName: member.first_name,
        role: member.role,
        email: authMap.get(member.user_id!)?.email || null,
      })),
    tasks30: T.filter(
      (item) =>
        item.household_id === household.id &&
        (item.created_at >= since30 || (item.completed_at && item.completed_at >= since30)),
    ).length,
    shopping30: S.filter(
      (item) =>
        item.household_id === household.id &&
        (item.created_at >= since30 || (item.bought_at && item.bought_at >= since30)),
    ).length,
    events30: E.filter((item) => item.household_id === household.id && item.created_at >= since30).length,
  }));

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    admin: currentAdmin.email,
    kpiAvailability: { sharing: sharingAvailable },
    kpis: {
      users: authUsers.length,
      households: H.length,
      activeMemberships: active.length,
      multiHouseholdUsers: [...multi.values()].filter((count) => count > 1).length,
      newUsers7: authUsers.filter((user) => user.created_at >= since7).length,
      newUsers30: authUsers.filter((user) => user.created_at >= since30).length,
      activeHouseholds7: activityHouseholds(since7),
      activeHouseholds30: activityHouseholds(since30),
      tasksCreated30: T.filter((item) => item.created_at >= since30).length,
      tasksCompleted30: T.filter((item) => item.completed_at && item.completed_at >= since30).length,
      shoppingBought30: S.filter((item) => item.bought_at && item.bought_at >= since30).length,
      eventsCreated30: E.filter((item) => item.created_at >= since30).length,
      sharesTotal: SH.length,
      shares30: SH.filter((item) => item.created_at >= since30).length,
      shareUsers30: new Set(SH.filter((item) => item.created_at >= since30).map((item) => item.user_id)).size,
    },
    recentHouseholds: householdDetails.slice(0, 8).map((household) => ({
      id: household.id,
      name: household.name,
      created_at: household.createdAt,
      members: household.members.length,
    })),
    users,
    households: householdDetails,
  });
}
