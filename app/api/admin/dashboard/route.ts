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
  const since60 = isoAgo(60);

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

  const previous30 = {
    newUsers: authUsers.filter((user) => user.created_at >= since60 && user.created_at < since30).length,
    tasksCompleted: T.filter((item) => item.completed_at && item.completed_at >= since60 && item.completed_at < since30).length,
    shoppingBought: S.filter((item) => item.bought_at && item.bought_at >= since60 && item.bought_at < since30).length,
    eventsCreated: E.filter((item) => item.created_at >= since60 && item.created_at < since30).length,
    shares: SH.filter((item) => item.created_at >= since60 && item.created_at < since30).length,
  };

  const current30 = {
    newUsers: authUsers.filter((user) => user.created_at >= since30).length,
    tasksCompleted: T.filter((item) => item.completed_at && item.completed_at >= since30).length,
    shoppingBought: S.filter((item) => item.bought_at && item.bought_at >= since30).length,
    eventsCreated: E.filter((item) => item.created_at >= since30).length,
    shares: SH.filter((item) => item.created_at >= since30).length,
  };

  const changePct = (current: number, previous: number) => {
    if (previous === 0) return current === 0 ? 0 : null;
    return Math.round(((current - previous) / previous) * 100);
  };

  type Insight = {
    id: string;
    severity: "positive" | "attention" | "opportunity" | "info";
    title: string;
    observation: string;
    why: string;
    action: string;
    metric: string;
  };

  const intelligence: Insight[] = [];
  const newUsersDelta = changePct(current30.newUsers, previous30.newUsers);
  const tasksDelta = changePct(current30.tasksCompleted, previous30.tasksCompleted);
  const sharesDelta = changePct(current30.shares, previous30.shares);
  const activeRate = H.length ? Math.round((activityHouseholds(since30) / H.length) * 100) : 0;
  const shareRate = authUsers.length ? Math.round((new Set(SH.filter((item) => item.created_at >= since30).map((item) => item.user_id)).size / authUsers.length) * 100) : 0;

  if (newUsersDelta !== null && newUsersDelta >= 20 && current30.newUsers >= 5) {
    intelligence.push({
      id: "growth-up",
      severity: "positive",
      title: "La croissance des inscriptions accélère",
      observation: `Les nouveaux comptes progressent de ${newUsersDelta}% par rapport aux 30 jours précédents.`,
      why: "C'est le bon moment pour identifier le canal ou le message qui apporte ces nouveaux utilisateurs et le renforcer.",
      action: "Comparer les sources d'acquisition et demander aux nouveaux utilisateurs comment ils ont découvert DABO.",
      metric: "Nouveaux utilisateurs · 30 j",
    });
  } else if (newUsersDelta !== null && newUsersDelta <= -20 && previous30.newUsers >= 5) {
    intelligence.push({
      id: "growth-down",
      severity: "attention",
      title: "Les nouvelles inscriptions ralentissent",
      observation: `Les nouveaux comptes reculent de ${Math.abs(newUsersDelta)}% par rapport aux 30 jours précédents.`,
      why: "Un ralentissement durable réduit le nombre de foyers qui peuvent s'activer et limite la croissance organique.",
      action: "Relancer une campagne simple : démonstration DABO en vidéo courte + appel au partage auprès des utilisateurs actifs.",
      metric: "Nouveaux utilisateurs · 30 j",
    });
  }

  if (activeRate < 60 && H.length >= 10) {
    intelligence.push({
      id: "household-activation",
      severity: "attention",
      title: "Une partie des foyers n'est plus active",
      observation: `${activeRate}% des foyers ont eu une activité sur les 30 derniers jours.`,
      why: "La croissance n'a de valeur que si les foyers reviennent réellement utiliser DABO.",
      action: "Identifier les foyers inactifs depuis 14 à 30 jours et tester une relance douce centrée sur une action utile : tâche, course ou événement.",
      metric: "Foyers actifs · 30 j",
    });
  }

  if (current30.shares === 0) {
    intelligence.push({
      id: "sharing-zero",
      severity: "opportunity",
      title: "Le bouche-à-oreille est encore inexploité",
      observation: "Aucun partage DABO n'a encore été enregistré sur les 30 derniers jours.",
      why: "Les utilisateurs satisfaits peuvent devenir un canal d'acquisition à coût presque nul.",
      action: "Déclencher une invitation à partager après un moment de réussite : tâche terminée, liste de courses finalisée ou première semaine active.",
      metric: "Partages déclenchés · 30 j",
    });
  } else if (shareRate < 10 && authUsers.length >= 10) {
    intelligence.push({
      id: "sharing-low",
      severity: "opportunity",
      title: "Le partage peut devenir un moteur d'acquisition",
      observation: `${shareRate}% des utilisateurs ont partagé DABO sur les 30 derniers jours.`,
      why: "Une petite hausse du nombre d'ambassadeurs peut générer des inscriptions organiques sans budget média.",
      action: "Tester un message de recommandation plus humain et le proposer uniquement aux utilisateurs actifs au bon moment.",
      metric: "Ambassadeurs · 30 j",
    });
  } else if (sharesDelta !== null && sharesDelta >= 25 && current30.shares >= 5) {
    intelligence.push({
      id: "sharing-up",
      severity: "positive",
      title: "Le partage de DABO progresse",
      observation: `Les partages progressent de ${sharesDelta}% par rapport aux 30 jours précédents.`,
      why: "Le bouche-à-oreille commence à produire un signal mesurable.",
      action: "Ajouter ensuite des liens d'invitation attribués pour mesurer partage → visite → inscription → foyer activé.",
      metric: "Partages · 30 j",
    });
  }

  if (tasksDelta !== null && tasksDelta >= 25 && current30.tasksCompleted >= 10) {
    intelligence.push({
      id: "tasks-up",
      severity: "positive",
      title: "L'usage des tâches se renforce",
      observation: `Les tâches terminées progressent de ${tasksDelta}% sur la période.`,
      why: "Cela indique que DABO devient un outil utilisé pour accomplir, pas seulement pour consulter.",
      action: "Mettre davantage en avant les routines et l'équilibre des contributions pour transformer cet usage en habitude.",
      metric: "Tâches terminées · 30 j",
    });
  }

  if (!intelligence.length) {
    intelligence.push({
      id: "data-building",
      severity: "info",
      title: "LOBA construit encore sa base de référence",
      observation: "Les données sont encore trop limitées pour produire une alerte forte et fiable.",
      why: "Mieux vaut attendre un signal statistique utile que fabriquer une conclusion sur trop peu d'utilisateurs.",
      action: "Continuer à faire tester DABO et surveiller inscriptions, foyers actifs, tâches terminées et partages.",
      metric: "Qualité des données",
    });
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    admin: currentAdmin.email,
    loba: {
      name: "LOBA",
      tagline: "L’assistant DABO",
      intelligence: intelligence.slice(0, 4),
      periods: { current30, previous30 },
    },
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
