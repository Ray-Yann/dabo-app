import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { requireDaboAdmin } from "@/lib/admin-auth";
import { calculateRetention } from "@/lib/retention";

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
  const since14 = isoAgo(14);
  const since30 = isoAgo(30);
  const since60 = isoAgo(60);

  // Les sources du cockpit sont indépendantes : une source temporairement lente ou indisponible
  // ne doit plus faire tomber toutes les pages Admin. Chaque erreur est nommée dans les logs,
  // puis le dashboard continue avec un jeu vide pour cette source et signale explicitement
  // que les données affichées sont partielles.
  const [households, members, tasks, shopping, events, contributions, auth] = await Promise.all([
    db.from("households").select("id,name,created_at").order("created_at", { ascending: false }),
    db.from("members").select("id,user_id,household_id,first_name,role,created_at,left_at"),
    db.from("tasks").select("id,household_id,status,created_at,completed_at"),
    db.from("shopping_items").select("id,household_id,status,created_at,bought_at"),
    db.from("calendar_events").select("id,household_id,created_at"),
    db.from("task_contributions").select("id,household_id,completed_at,cancelled_at"),
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const sourceErrors = {
    households: households.error,
    members: members.error,
    tasks: tasks.error,
    shopping: shopping.error,
    calendar: events.error,
    contributions: contributions.error,
    authUsers: auth.error,
  };
  const sourceAvailability = Object.fromEntries(
    Object.entries(sourceErrors).map(([source, error]) => [source, !error]),
  ) as Record<keyof typeof sourceErrors, boolean>;
  const degradedSources = Object.entries(sourceErrors)
    .filter(([, error]) => Boolean(error))
    .map(([source]) => source);

  for (const [source, error] of Object.entries(sourceErrors)) {
    if (error) console.error(`[admin/dashboard] Source unavailable: ${source}`, error);
  }

  // KPI « Faire connaître DABO » : isolé volontairement.
  // Si la table ou la requête rencontre un souci, le reste du cockpit reste utilisable.
  let shareRows: { id: string; user_id: string; household_id: string | null; method: string; referral_token: string | null; created_at: string }[] = [];
  let sharingAvailable = true;

  try {
    const shares = await db
      .from("app_share_events")
      .select("id,user_id,household_id,method,referral_token,created_at");

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

  // Funnel d'acquisition : optionnel et isolé, comme le KPI de partage.
  let acquisitionRows: { event_name: string; visitor_id: string; referral_token: string | null; user_id: string | null; household_id: string | null; value_type: string | null; created_at: string }[] = [];
  let acquisitionAvailable = true;
  try {
    const acquisition = await db.from("acquisition_events").select("event_name,visitor_id,referral_token,user_id,household_id,value_type,created_at");
    if (acquisition.error) {
      acquisitionAvailable = false;
      console.error("[admin/dashboard] Acquisition funnel unavailable", acquisition.error);
    } else acquisitionRows = acquisition.data || [];
  } catch (error) {
    acquisitionAvailable = false;
    console.error("[admin/dashboard] Acquisition funnel failed", error);
  }

  const H = sourceAvailability.households ? households.data || [] : [];
  const M = sourceAvailability.members ? members.data || [] : [];
  const T = sourceAvailability.tasks ? tasks.data || [] : [];
  const S = sourceAvailability.shopping ? shopping.data || [] : [];
  const E = sourceAvailability.calendar ? events.data || [] : [];
  const C = sourceAvailability.contributions ? contributions.data || [] : [];
  const SH = shareRows;
  const A = acquisitionRows;
  const authUsers = sourceAvailability.authUsers ? auth.data?.users || [] : [];

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

  const uniqueVisitors = (rows: typeof A) => new Set(rows.map((item) => item.visitor_id)).size;
  const attributed = A.filter((item) => item.referral_token);
  const attributedVisits = uniqueVisitors(attributed.filter((item) => item.event_name === "landing_view"));
  const attributedSignups = uniqueVisitors(attributed.filter((item) => item.event_name === "signup_completed"));
  const attributedHouseholds = uniqueVisitors(attributed.filter((item) => item.event_name === "household_created" || item.event_name === "household_joined"));
  const attributedFirstValue = uniqueVisitors(attributed.filter((item) => item.event_name === "first_value"));
  const landingVisitors = uniqueVisitors(A.filter((item) => item.event_name === "landing_view"));

  // Acquisition V1 : on attribue uniquement ce que le signal technique prouve.
  const measuredSignups = uniqueVisitors(A.filter((item) => item.event_name === "signup_completed"));
  const measuredHouseholds = uniqueVisitors(A.filter((item) => item.event_name === "household_created" || item.event_name === "household_joined"));
  const measuredFirstValue = uniqueVisitors(A.filter((item) => item.event_name === "first_value"));
  const unattributedVisits = uniqueVisitors(A.filter((item) => item.event_name === "landing_view" && !item.referral_token));
  const unattributedSignups = uniqueVisitors(A.filter((item) => item.event_name === "signup_completed" && !item.referral_token));
  const shareTokens = new Set(SH.map((item) => item.referral_token).filter((token): token is string => Boolean(token)));
  const visitedShareTokens = new Set(A.filter((item) => item.event_name === "landing_view" && item.referral_token && shareTokens.has(item.referral_token)).map((item) => item.referral_token!));
  const signupShareTokens = new Set(A.filter((item) => item.event_name === "signup_completed" && item.referral_token && shareTokens.has(item.referral_token)).map((item) => item.referral_token!));
  const firstAcquisitionEventAt = A.map((item) => item.created_at).sort()[0] || null;
  const pct = (num: number, den: number) => den ? Math.round((num / den) * 100) : 0;
  const acquisitionSummary = {
    instrumentedSince: firstAcquisitionEventAt,
    measuredVisitors: landingVisitors, measuredSignups, measuredHouseholds, measuredFirstValue,
    attributedVisits, attributedSignups, attributedHouseholds, attributedFirstValue,
    unattributedVisits, unattributedSignups,
    shareLinksCreated: shareTokens.size, shareLinksVisited: visitedShareTokens.size, shareLinksWithSignup: signupShareTokens.size,
    visitToSignupRate: pct(measuredSignups, landingVisitors),
    attributedVisitToSignupRate: pct(attributedSignups, attributedVisits),
    sources: [
      { id: "dabo-share", label: "Partage DABO attribué", visits: attributedVisits, signups: attributedSignups, households: attributedHouseholds, firstValue: attributedFirstValue },
      { id: "unattributed", label: "Sans attribution mesurée", visits: unattributedVisits, signups: unattributedSignups, households: uniqueVisitors(A.filter((item) => (item.event_name === "household_created" || item.event_name === "household_joined") && !item.referral_token)), firstValue: uniqueVisitors(A.filter((item) => item.event_name === "first_value" && !item.referral_token)) },
    ],
  };

  // Croissance V1 : comparer uniquement des fenêtres de même durée.
  // Une variation dont la période précédente vaut 0 reste non calculable plutôt que d'afficher un pourcentage trompeur.
  const growthChange = (current: number, previous: number) => ({
    current,
    previous,
    delta: current - previous,
    rate: previous > 0 ? Math.round(((current - previous) / previous) * 100) : null,
    comparable: previous > 0,
  });
  const newUsers7 = authUsers.filter((user) => user.created_at >= since7).length;
  const previousUsers7 = authUsers.filter((user) => user.created_at >= since14 && user.created_at < since7).length;
  const newHouseholds7 = H.filter((item) => item.created_at >= since7).length;
  const previousHouseholds7 = H.filter((item) => item.created_at >= since14 && item.created_at < since7).length;
  const newHouseholds30 = H.filter((item) => item.created_at >= since30).length;
  const previousHouseholds30 = H.filter((item) => item.created_at >= since60 && item.created_at < since30).length;
  const growth = {
    totals: { users: authUsers.length, households: H.length },
    users7: growthChange(newUsers7, previousUsers7),
    users30: growthChange(current30.newUsers, previous30.newUsers),
    households7: growthChange(newHouseholds7, previousHouseholds7),
    households30: growthChange(newHouseholds30, previousHouseholds30),
    activeHouseholds: { sevenDays: activityHouseholds(since7), thirtyDays: activityHouseholds(since30) },
    rule: "Une variation n'est affichée que lorsque la période précédente contient au moins une observation. Sinon DABO conserve les volumes et indique que la comparaison n'est pas encore calculable.",
  };

  // Rétention V1 : cohorte = première inscription mesurée par identité.
  // J1/J7/J30 = retour via app_open dans la fenêtre de 24 h commençant à D+N.
  const retention = calculateRetention(A);
  const retentionJ1 = retention.j1;
  const retentionJ7 = retention.j7;
  const retentionJ30 = retention.j30;

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
  const usersWithHousehold = new Set(active.map((member) => member.user_id)).size;
  const accountsWithoutHousehold = Math.max(0, authUsers.length - usersWithHousehold);
  const accountToHouseholdRate = authUsers.length ? Math.round((usersWithHousehold / authUsers.length) * 100) : 0;

  // Engagement V1 : on mesure l’usage observable des foyers sans le confondre avec la rétention.
  // Un module est considéré utilisé sur 30 j s’il contient une action créée ou finalisée sur la période.
  const taskHouseholds30 = new Set(
    T.filter((item) => item.created_at >= since30 || (item.completed_at && item.completed_at >= since30)).map((item) => item.household_id),
  );
  const shoppingHouseholds30 = new Set(
    S.filter((item) => item.created_at >= since30 || (item.bought_at && item.bought_at >= since30)).map((item) => item.household_id),
  );
  const calendarHouseholds30 = new Set(
    E.filter((item) => item.created_at >= since30).map((item) => item.household_id),
  );
  const activeHouseholds30Count = activityHouseholds(since30);
  const activeHouseholds7Count = activityHouseholds(since7);
  const completedActions30 = current30.tasksCompleted + current30.shoppingBought + current30.eventsCreated;
  const averageCompletedActionsPerActiveHousehold30 = activeHouseholds30Count
    ? Math.round((completedActions30 / activeHouseholds30Count) * 10) / 10
    : 0;
  const multiModuleHouseholds30 = H.filter((household) =>
    [taskHouseholds30.has(household.id), shoppingHouseholds30.has(household.id), calendarHouseholds30.has(household.id)]
      .filter(Boolean).length >= 2,
  ).length;
  const threeModuleHouseholds30 = H.filter((household) =>
    taskHouseholds30.has(household.id) && shoppingHouseholds30.has(household.id) && calendarHouseholds30.has(household.id),
  ).length;

  if (sourceAvailability.authUsers && newUsersDelta !== null && newUsersDelta >= 20 && current30.newUsers >= 5) {
    intelligence.push({
      id: "growth-up",
      severity: "positive",
      title: "La croissance des inscriptions accélère",
      observation: `Les nouveaux comptes progressent de ${newUsersDelta}% par rapport aux 30 jours précédents.`,
      why: "C'est le bon moment pour identifier le canal ou le message qui apporte ces nouveaux utilisateurs et le renforcer.",
      action: "Comparer les sources d'acquisition et demander aux nouveaux utilisateurs comment ils ont découvert DABO.",
      metric: "Nouveaux utilisateurs · 30 j",
    });
  } else if (sourceAvailability.authUsers && newUsersDelta !== null && newUsersDelta <= -20 && previous30.newUsers >= 5) {
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

  if (sourceAvailability.authUsers && sourceAvailability.members && authUsers.length >= 10 && accountToHouseholdRate < 80) {
    intelligence.push({
      id: "account-activation",
      severity: "attention",
      title: "Des comptes n’atteignent pas encore leur premier foyer",
      observation: `${accountsWithoutHousehold} compte${accountsWithoutHousehold > 1 ? "s" : ""} sur ${authUsers.length} n’est actuellement rattaché à aucun foyer actif (${accountToHouseholdRate}% compte → foyer).`,
      why: "Une inscription seule ne crée pas encore de valeur : l’utilisateur doit rejoindre ou créer un foyer pour commencer à utiliser DABO.",
      action: "Simplifier l’étape juste après l’inscription et mesurer séparément création d’un foyer et acceptation d’une invitation.",
      metric: "Activation · compte → foyer",
    });
  }

  if (sourceAvailability.households && sourceAvailability.tasks && sourceAvailability.shopping && sourceAvailability.calendar && sourceAvailability.contributions && activeRate < 60 && H.length >= 10) {
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

  if (sharingAvailable && current30.shares === 0) {
    intelligence.push({
      id: "sharing-zero",
      severity: "opportunity",
      title: "Le bouche-à-oreille est encore inexploité",
      observation: "Aucun partage DABO n'a encore été enregistré sur les 30 derniers jours.",
      why: "Les utilisateurs satisfaits peuvent devenir un canal d'acquisition à coût presque nul.",
      action: "Déclencher une invitation à partager après un moment de réussite : tâche terminée, liste de courses finalisée ou première semaine active.",
      metric: "Partages déclenchés · 30 j",
    });
  } else if (sharingAvailable && sourceAvailability.authUsers && shareRate < 10 && authUsers.length >= 10) {
    intelligence.push({
      id: "sharing-low",
      severity: "opportunity",
      title: "Le partage peut devenir un moteur d'acquisition",
      observation: `${shareRate}% des utilisateurs ont partagé DABO sur les 30 derniers jours.`,
      why: "Une petite hausse du nombre d'ambassadeurs peut générer des inscriptions organiques sans budget média.",
      action: "Tester un message de recommandation plus humain et le proposer uniquement aux utilisateurs actifs au bon moment.",
      metric: "Ambassadeurs · 30 j",
    });
  } else if (sharingAvailable && sharesDelta !== null && sharesDelta >= 25 && current30.shares >= 5) {
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

  if (sourceAvailability.tasks && tasksDelta !== null && tasksDelta >= 25 && current30.tasksCompleted >= 10) {
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
    dataQuality: {
      complete: degradedSources.length === 0,
      degradedSources,
      sources: sourceAvailability,
    },
    loba: {
      name: "LOBA",
      tagline: "L’assistant DABO",
      intelligence: intelligence.slice(0, 4),
      periods: { current30, previous30 },
      growthEngine: {
        objective: "Transformer les utilisateurs satisfaits en croissance durable, sans pression ni dark patterns.",
        funnel: acquisitionAvailable ? [
          { step: "Visites via partage", value: attributedVisits },
          { step: "Inscriptions attribuées", value: attributedSignups },
          { step: "Foyer après partage", value: attributedHouseholds },
          { step: "Première valeur", value: attributedFirstValue },
        ] : [
          { step: "Inscription", value: authUsers.length },
          { step: "Compte → foyer", value: usersWithHousehold },
          { step: "Foyer actif · 30 j", value: activityHouseholds(since30) },
          { step: "Ambassadeurs · 30 j", value: new Set(SH.filter((item) => item.created_at >= since30).map((item) => item.user_id)).size },
        ],
        campaigns: [
          { id: "success-share", title: "Partager après un moment utile", channel: "Dans DABO", status: "À tester", hypothesis: "Une invitation après une réussite du foyer sera mieux acceptée qu’une demande de partage générique.", action: "Tester une invitation douce après une liste de courses finalisée ou une semaine active.", guardrail: "Une seule sollicitation contextuelle ; jamais de culpabilisation." },
          { id: "demo-social", title: "DABO en 20 secondes", channel: "Réseaux sociaux", status: "À préparer", hypothesis: "Une démonstration très courte du bénéfice concret de DABO peut améliorer la découverte du produit.", action: "Préparer 3 scripts FR/NL/EN centrés sur charge mentale, coordination et équité.", guardrail: "Promettre uniquement ce que DABO fait réellement aujourd’hui." },
          { id: "reactivation", title: "Retour utile, pas notification vide", channel: "DABO / notification", status: "À mesurer", hypothesis: "Une relance liée à une action concrète du foyer peut réactiver sans créer de pression.", action: "Segmenter d’abord les foyers inactifs 14–30 jours avant tout envoi.", guardrail: "Fréquence basse, opt-out respecté, aucune mécanique anxiogène." },
        ],
        principles: ["Réduire la charge mentale", "Aucune croissance par culpabilisation", "Mesurer avant d’automatiser", "Dépense et publication externe sous autorisation"],
      },
      productCapabilities: [
        { id: "tasks", title: "Tâches & routines", stage: "Disponible", value: "Tâches, récurrences, attribution et contributions du foyer." },
        { id: "shopping", title: "Courses", stage: "Disponible", value: "Listes, magasins du foyer, suggestions et historique." },
        { id: "calendar", title: "Calendrier", stage: "Disponible", value: "Événements du foyer et événements personnels privés." },
        { id: "finances", title: "Finances", stage: "Disponible", value: "Dépenses, factures, échéances, repères mensuels et rappels." },
        { id: "balance", title: "Équilibre", stage: "Disponible", value: "Contributions, répartition et tendances du foyer." },
      ],
      productRadar: [
        { id: "services", title: "Services & professionnels", stage: "Piste définie", value: "Aider à trouver plombier, électricien, nounou, médecin ou autre professionnel selon le besoin du foyer." },
        { id: "documents", title: "Documents du foyer", stage: "Piste définie", value: "Centraliser garanties, contrats et documents utiles avec rappels d’échéance." },
      ],
    },
    kpiAvailability: { sharing: sharingAvailable, acquisition: acquisitionAvailable },
    acquisition: acquisitionAvailable ? acquisitionSummary : null,
    growth,
    retention: {
      measuredSignups: retention.measuredSignups,
      j1: retention.j1,
      j7: retention.j7,
      j30: retention.j30,
      cohorts: retention.cohorts,
    },
    kpis: {
      users: authUsers.length,
      households: H.length,
      activeMemberships: active.length,
      multiHouseholdUsers: [...multi.values()].filter((count) => count > 1).length,
      newUsers7: authUsers.filter((user) => user.created_at >= since7).length,
      newUsers30: authUsers.filter((user) => user.created_at >= since30).length,
      activeHouseholds7: activeHouseholds7Count,
      activeHouseholds30: activeHouseholds30Count,
      taskHouseholds30: taskHouseholds30.size,
      shoppingHouseholds30: shoppingHouseholds30.size,
      calendarHouseholds30: calendarHouseholds30.size,
      multiModuleHouseholds30,
      threeModuleHouseholds30,
      completedActions30,
      averageCompletedActionsPerActiveHousehold30,
      tasksCreated30: T.filter((item) => item.created_at >= since30).length,
      tasksCompleted30: T.filter((item) => item.completed_at && item.completed_at >= since30).length,
      shoppingBought30: S.filter((item) => item.bought_at && item.bought_at >= since30).length,
      eventsCreated30: E.filter((item) => item.created_at >= since30).length,
      sharesTotal: SH.length,
      shares30: SH.filter((item) => item.created_at >= since30).length,
      shareUsers30: new Set(SH.filter((item) => item.created_at >= since30).map((item) => item.user_id)).size,
      accountsWithoutHousehold,
      accountToHouseholdRate,
      landingVisitors,
      attributedVisits,
      attributedSignups,
      attributedHouseholds,
      attributedFirstValue,
      retentionJ1: retentionJ1.rate,
      retentionJ7: retentionJ7.rate,
      retentionJ30: retentionJ30.rate,
      retentionJ1Eligible: retentionJ1.eligible,
      retentionJ7Eligible: retentionJ7.eligible,
      retentionJ30Eligible: retentionJ30.eligible,
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
