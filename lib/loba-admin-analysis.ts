export type LobaInsight = { title: string; observation: string; action: string; metric: string };
export type FunnelPoint = { step: string; value: number };

export type LobaAnalysis = {
  facts: string[];
  ratios: { id: string; label: string; numerator: number; denominator: number; rate: number; loss: number; comparable: boolean }[];
  gaps: string[];
  strongestSignal: string;
  recommendation: string;
};

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

export function buildLobaAnalysis(kpis: Record<string, number>): LobaAnalysis {
  const users = kpis.users ?? 0;
  const usersWithHousehold = Math.max(0, users - (kpis.accountsWithoutHousehold ?? 0));
  const households = kpis.households ?? 0;
  const activeHouseholds = kpis.activeHouseholds30 ?? 0;
  const ambassadors = kpis.shareUsers30 ?? 0;

  const accountActivation = pct(usersWithHousehold, users);
  const householdActivity = pct(activeHouseholds, households);
  const ambassadorRate = pct(ambassadors, users);

  const ratios = [
    { id: "account-household", label: "Compte → foyer", numerator: usersWithHousehold, denominator: users, rate: accountActivation, loss: Math.max(0, users - usersWithHousehold), comparable: true },
    { id: "household-active", label: "Foyers actifs · 30 j", numerator: activeHouseholds, denominator: households, rate: householdActivity, loss: Math.max(0, households - activeHouseholds), comparable: true },
    { id: "ambassadors", label: "Utilisateurs ambassadeurs · 30 j", numerator: ambassadors, denominator: users, rate: ambassadorRate, loss: Math.max(0, users - ambassadors), comparable: false },
  ];

  const measurable = ratios.slice(0, 2).filter(x => x.denominator > 0).sort((a, b) => a.rate - b.rate);
  const weakest = measurable[0];
  const strongestSignal = weakest
    ? `${weakest.label} est le ratio mesurable le plus faible : ${weakest.rate}% (${weakest.numerator}/${weakest.denominator}).`
    : "Données insuffisantes pour identifier un signal dominant.";

  const gaps = [
    "Le cockpit ne mesure pas encore partage → visite → inscription avec des liens attribués.",
    "Les cohortes de rétention J1/J7/J30 ne sont pas encore disponibles.",
    "Compte → foyer mesure des utilisateurs, tandis que foyers actifs mesure des foyers : ces deux étapes ne doivent pas être présentées comme une conversion séquentielle directe.",
  ];

  const recommendation = weakest?.id === "household-active"
    ? "Priorité analytique : comprendre pourquoi certains foyers créés ne sont plus actifs, puis segmenter par ancienneté et dernier usage avant toute relance."
    : "Priorité analytique : réduire la friction entre inscription et premier foyer, en distinguant création d’un foyer et acceptation d’une invitation.";

  return {
    facts: [
      `${users} compte${users === 1 ? "" : "s"} DABO inscrit${users === 1 ? "" : "s"}.`,
      `${usersWithHousehold} compte${usersWithHousehold === 1 ? "" : "s"} rattaché${usersWithHousehold === 1 ? "" : "s"} à au moins un foyer actif (${accountActivation}%).`,
      `${activeHouseholds} foyer${activeHouseholds === 1 ? "" : "s"} actif${activeHouseholds === 1 ? "" : "s"} sur ${households} sur les 30 derniers jours (${householdActivity}%).`,
      `${ambassadors} ambassadeur${ambassadors === 1 ? "" : "s"} sur 30 jours et ${kpis.shares30 ?? 0} partage${(kpis.shares30 ?? 0) === 1 ? "" : "s"} enregistré${(kpis.shares30 ?? 0) === 1 ? "" : "s"}.`,
    ],
    ratios,
    gaps,
    strongestSignal,
    recommendation,
  };
}

export function answerLobaAdmin(
  question: string,
  kpis: Record<string, number>,
  insights: LobaInsight[],
  funnel: FunnelPoint[],
) {
  const q = question.toLocaleLowerCase("fr");
  const analysis = buildLobaAnalysis(kpis);
  const users = kpis.users ?? 0;
  const without = kpis.accountsWithoutHousehold ?? 0;
  const activation = kpis.accountToHouseholdRate ?? 0;
  const shares = kpis.shares30 ?? 0;

  const asksFunnel = /funnel|entonnoir|parcours|perd|perte|rupture|conversion/.test(q);
  const asksActivation = /activation|sans foyer|pas.*foyer|combien.*foyer|inscri.*foyer/.test(q);
  const asksRetention = /rétention|retention|revien|cohorte|j7|j30/.test(q);
  const asksPriority = /priorité|priorite|faire aujourd|cette semaine|recommande/.test(q);
  const asksGrowth = /croissance|grandir|acquisition|connaître|campagne|ramener|utilisateur/.test(q);
  const asksSharing = /partage|ambassadeur|bouche/.test(q);
  const asksData = /donnée|donnee|mesur|sais-tu|disponible|manque/.test(q);

  if (asksFunnel) {
    return `Analyse V5 : ${analysis.strongestSignal} Attention : je ne considère pas “Compte → foyer” puis “Foyer actif” comme deux conversions directement chaînées, car la première mesure des comptes et la seconde des foyers. Aujourd’hui, ${users - without}/${users} comptes sont rattachés à un foyer (${activation}%) et ${kpis.activeHouseholds30 ?? 0}/${kpis.households ?? 0} foyers sont actifs sur 30 jours (${analysis.ratios[1].rate}%). ${analysis.recommendation} Pour identifier la plus grosse fuite de tout le funnel avec certitude, il manque encore partage → visite → inscription et les cohortes J1/J7/J30.`;
  }

  if (asksActivation) {
    return `DABO compte ${users} utilisateurs. ${without} compte${without === 1 ? "" : "s"} ${without === 1 ? "n’est" : "ne sont"} rattaché${without === 1 ? "" : "s"} à aucun foyer actif : ${users - without}/${users} sont donc activés au sens compte → foyer, soit ${activation}%. Je recommande de mesurer séparément “créer un foyer” et “rejoindre un foyer” pour localiser précisément la friction.`;
  }

  if (asksRetention) {
    return `${kpis.activeHouseholds30 ?? 0} foyers sur ${kpis.households ?? 0} ont eu une activité sur 30 jours, soit ${analysis.ratios[1].rate}%. C’est un indicateur d’activité, pas encore une vraie rétention. Je ne prétends donc pas connaître la rétention J7/J30 : il faut ajouter des cohortes par date d’activation et mesurer le retour des mêmes foyers.`;
  }

  if (asksSharing) {
    return `${kpis.shareUsers30 ?? 0} ambassadeur${(kpis.shareUsers30 ?? 0) === 1 ? "" : "s"} et ${shares} partage${shares === 1 ? "" : "s"} sont enregistrés sur 30 jours. C’est un signal d’usage du partage, pas encore un canal d’acquisition mesuré : sans lien attribué, je ne peux pas relier un partage à une visite, une inscription puis un foyer activé.`;
  }

  if (asksPriority) {
    const top = insights.slice(0, 3);
    return `${analysis.strongestSignal} ${analysis.recommendation}${top.length ? ` Les signaux complémentaires du cockpit sont : ${top.map((x, i) => `${i + 1}. ${x.title}`).join(" ; ")}.` : ""}`;
  }

  if (asksGrowth) {
    const top = insights[0];
    return `Pour faire grandir DABO, je sépare acquisition, activation et usage. Activation compte → foyer : ${activation}%. Foyers actifs sur 30 jours : ${analysis.ratios[1].rate}%. Partages sur 30 jours : ${shares}. Je testerais d’abord une expérience mesurable à faible pression, puis j’observerais son effet avant de l’automatiser.${top ? ` Signal actuel : ${top.title}.` : ""} Je ne peux pas encore attribuer de nouveaux utilisateurs à une campagne tant que partage → visite → inscription n’est pas instrumenté.`;
  }

  if (asksData) {
    return `Je peux actuellement exploiter : comptes, rattachement compte → foyer, foyers créés, foyers actifs à 7/30 jours, tâches, courses, événements, multi-foyers et partages. Mes limites actuelles : ${analysis.gaps.join(" ")}`;
  }

  if (/kpi|résumé|resume|situation|état|etat|diagnostic|analyse/.test(q)) {
    return `Diagnostic V5 : ${analysis.facts.join(" ")} ${analysis.strongestSignal} ${analysis.recommendation}`;
  }

  return `Je peux analyser les KPI plutôt que seulement reconnaître des mots-clés. Demande-moi par exemple : “Où perd-on le plus d’utilisateurs ?”, “Compare activation et activité”, “Quelles données te manquent ?”, “Quelle est la priorité cette semaine ?” ou “Que savons-nous réellement de la rétention ?”. Si une conclusion n’est pas démontrable avec les données disponibles, je te le dirai.`;
}
