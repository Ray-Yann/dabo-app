import type { LobaHouseholdDomain } from "@/lib/loba-household-context-router";

export type LobaNeverJudgeResult = {
  answer: string;
  guarded: boolean;
  reason: "personal_judgment" | null;
};

const JUDGMENT_PATTERNS = [
  /\b(?:paresseux|paresseuse|fainéant|fainéante|désorganisé|désorganisée|irresponsable|égoïste)\b/i,
  /\b(?:lazy|disorganized|irresponsible|selfish)\b/i,
  /\b(?:lui|elle|il|he|she)\s+(?:devrait|doit|should|must)\s+(?:en\s+)?faire\s+(?:plus|davantage)/i,
  /\b(?:contribue|participe|travaille|aide)\s+(?:moins|peu|le moins)\b/i,
  /\b(?:contributes?|participates?|works?|helps?)\s+(?:less|the least|too little)\b/i,
  /\b(?:plus|moins)\s+(?:impliqué|impliquée|méritant|méritante|responsable)\b/i,
  /\b(?:more|less)\s+(?:involved|deserving|responsible)\b/i,
];

const COMPARISON_PATTERNS = [
  /\b(?:plus|moins|davantage|mieux|pire|meilleur|meilleure)\b/i,
  /\b(?:more|less|better|worse|best|worst)\b/i,
  /\b(?:contre|versus|vs\.?)\b/i,
  /\b(?:écart|différence|répartition|comparaison)\b/i,
  /\b(?:gap|difference|distribution|comparison)\b/i,
];

function hasNamedMember(answer: string, memberNames: string[]) {
  const normalized = answer.toLocaleLowerCase();
  return memberNames.some((name) => {
    const candidate = name.trim().toLocaleLowerCase();
    return candidate.length >= 2 && normalized.includes(candidate);
  });
}

export function guardLobaNeverJudge(params: {
  answer: string;
  domain: LobaHouseholdDomain;
  memberNames: string[];
  language?: string | null;
}): LobaNeverJudgeResult {
  const answer = params.answer.trim();

  if (!answer || params.domain !== "balance") {
    return { answer, guarded: false, reason: null };
  }

  const judgment = JUDGMENT_PATTERNS.some((pattern) => pattern.test(answer));
  const comparison =
    COMPARISON_PATTERNS.some((pattern) => pattern.test(answer)) ||
    hasNamedMember(answer, params.memberNames);

  if (!judgment || !comparison) {
    return { answer, guarded: false, reason: null };
  }

  const language = (params.language || "fr").toLowerCase();

  const fallback =
    language.startsWith("en")
      ? "I can describe the contributions recorded in DABO, but they do not measure each person's overall effort, involvement or value. A difference in recorded points represents only part of household life. We can look at the current organization and possible ways to distribute tasks without judging a household member."
      : language.startsWith("nl")
        ? "Ik kan de bijdragen beschrijven die in DABO zijn geregistreerd, maar die meten niet de totale inzet, betrokkenheid of waarde van een persoon. Een verschil in geregistreerde punten toont slechts een deel van het huishouden. We kunnen de huidige organisatie en mogelijke taakverdeling bekijken zonder een gezinslid te beoordelen."
        : "Je peux décrire les contributions enregistrées dans DABO, mais elles ne mesurent pas l’effort global, l’implication ou la valeur d’une personne. Un écart de points enregistrés ne représente qu’une partie de la vie du foyer. Nous pouvons examiner l’organisation actuelle et des possibilités de répartition des tâches sans juger un membre du foyer.";

  return {
    answer: fallback,
    guarded: true,
    reason: "personal_judgment",
  };
}
