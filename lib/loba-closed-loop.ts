import { proposeClosedLoop } from "./closed-loop-reasoning";
import { prepareClosedLoopMaterialization } from "./closed-loop-materialization";

const normalize = (value: string) =>
  value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function isExplicitClosedLoopNeed(question: string): boolean {
  const text = normalize(question);
  if (!text || text.length > 500) return false;

  if (/^(combien|comment|pourquoi|quel|quelle|quels|quelles|qui|quand|ou|est-ce que|peux-tu m'expliquer)\b/.test(text)) {
    return false;
  }

  // Ne pas transformer une question ou une demande d'explication en action.
  if (/[?？]/.test(text)) return false;
  if (/\b(?:quoi|comment|pourquoi|que conseilles-tu|que me conseilles-tu|qu'en penses-tu|est-ce que|faut-il|devrais-je)\b/.test(text)) return false;
  if (/^acheter\s+(?:ou|plutot|plutôt)\b/.test(text)) return false;
  if (/^plus de\s+(?:details|detail|precisions|informations|renseignements)\b/.test(text)) return false;
  return /^(?:il (?:nous )?manque|nous manquons de|il n['’]?y a plus de|plus de |nous avons besoin de|on a besoin de|j['’]ai besoin de|acheter |commander |prendre rendez-vous |prendre rdv |la .+ (?:fuit|est en panne)|le .+ (?:fuit|est en panne)|reparer |organiser |preparer )/.test(text);
}

export function prepareLobaClosedLoop(question: string) {
  if (!isExplicitClosedLoopNeed(question)) return null;

  const proposal = proposeClosedLoop(question);
  if (!proposal) return null;

  const materialization = prepareClosedLoopMaterialization(proposal);

  return {
    proposal,
    plan: materialization.plan,
    ready: materialization.ready,
    missing: materialization.missing,
  };
}


