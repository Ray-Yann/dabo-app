import type{ClosedLoopResourceType,ClosedLoopRole}from"@/lib/closed-loop-engine";

export type ClosedLoopPlanKind="shopping"|"repair"|"appointment"|"payment"|"event"|"generic";
export type ClosedLoopProposalAction={resourceType:ClosedLoopResourceType;role:ClosedLoopRole;label:string;phase:"prepare"|"execute"|"verify"};
export type ClosedLoopProposal={
 needTitle:string;
 resolutionMode:"deterministic"|"human_required";
 actions:ClosedLoopProposalAction[];
 confidence:"rule"|"assisted";
 requiresApproval:true;
 planKind:ClosedLoopPlanKind;
 rationale:string;
};

const clean=(v:string)=>v.trim().replace(/\s+/g," ").replace(/[.!?]+$/g,"");
const normalized=(v:string)=>clean(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const humanConfirm=():ClosedLoopProposalAction=>({resourceType:"human_confirmation",role:"resolves",label:"Confirmer que le besoin est rÃ©glÃ©",phase:"verify"});
const task=(label:string,role:ClosedLoopRole="required",phase:ClosedLoopProposalAction["phase"]="execute"):ClosedLoopProposalAction=>({resourceType:"task",role,label:clean(label),phase});
const shopping=(label:string,role:ClosedLoopRole="required"):ClosedLoopProposalAction=>({resourceType:"shopping_item",role,label:clean(label),phase:"prepare"});
const calendar=(label:string):ClosedLoopProposalAction=>({resourceType:"calendar_event",role:"progress",label:clean(label),phase:"prepare"});
const proposal=(needTitle:string,planKind:ClosedLoopPlanKind,resolutionMode:ClosedLoopProposal["resolutionMode"],actions:ClosedLoopProposalAction[],rationale:string):ClosedLoopProposal=>({needTitle:clean(needTitle),planKind,resolutionMode,actions,confidence:"rule",requiresApproval:true,rationale});

const afterVerb=(text:string,verbs:string)=>clean(text.replace(new RegExp(`^.*?\\b(?:${verbs})\\b\\s*`,`i`),""))||clean(text);

/**
 * Household Reasoning V3. Conservative plan generator: it structures a household
 * need into operational capabilities, but never writes data and never decides truth.
 * Every proposal requires explicit approval before materialisation.
 */
export function proposeClosedLoop(input:string):ClosedLoopProposal|null{
 const text=clean(input);if(!text)return null;
 const n=normalized(text);

 // Explicit multi-step instruction wins over broad intent classification.
 const buyThen=/\b(?:acheter|prendre|commander)\s+(.+?)\s+(?:puis|et ensuite|avant de)\s+(.+)$/i.exec(text);
 if(buyThen)return proposal(clean(buyThen[2]),"generic","human_required",[
  shopping(buyThen[1]),task(buyThen[2]),humanConfirm()
 ],"Un achat prÃ©pare l'action rÃ©elle; seule la rÃ©alisation de l'action peut mener Ã  la rÃ©solution.");

 // Shortage / grocery need: buying the missing item is itself deterministic resolution.
 if(/\b(plus de|manque|epuise|rupture|courses?)\b/.test(n)&&!(/\b(fuite|panne|casse|repar|remplac|probleme)\b/.test(n))){
  const label=afterVerb(text,"acheter|prendre|commander");
  return proposal(text,"shopping","deterministic",[{...shopping(label,"resolves"),phase:"execute"}],"Le besoin porte directement sur l'acquisition d'un article; l'Ã©tat achetÃ© peut donc constituer la vÃ©ritÃ© de rÃ©solution.");
 }
 if(/^\s*(acheter|commander)\b/i.test(text)||(/^\s*prendre\b/i.test(text)&&!/\b(rendez[- ]?vous|rdv)\b/.test(n))){
  const label=afterVerb(text,"acheter|prendre|commander");
  return proposal(text,"shopping","deterministic",[{...shopping(label,"resolves"),phase:"execute"}],"L'achat demandÃ© est une action dont DABO peut vÃ©rifier l'achÃ¨vement via Courses.");
 }

 // Repair/problem: never invent a part or supplier. Diagnose, act, then verify reality.
 if(/\b(fuit|fuite|fuites|panne|casse|cassee|casser|reparer|reparation|remplacer|probleme|ne marche|ne fonctionne)\b/.test(n)){
  return proposal(text,"repair","human_required",[
   task(`Diagnostiquer : ${text}`,"progress","prepare"),
   task(`RÃ©soudre : ${text}`,"required","execute"),
   humanConfirm()
  ],"Un problÃ¨me matÃ©riel peut nÃ©cessiter des Ã©tapes inconnues Ã  l'avance; DABO prÃ©pare et exÃ©cute sans inventer la rÃ©solution rÃ©elle.");
 }

 // Appointment: scheduling is preparation, attendance/outcome is real-world truth.
 if(/\b(rendez[- ]?vous|rdv|dentiste|medecin|garage|reservation|reserver)\b/.test(n)){
  return proposal(text,"appointment","human_required",[
   calendar(text),task(`Effectuer : ${text}`,"required","execute"),humanConfirm()
  ],"Un Ã©vÃ©nement planifiÃ© ne prouve pas qu'il a rÃ©ellement eu lieu; une vÃ©rification humaine reste nÃ©cessaire.");
 }

 // Payment/bill: a paid finance bill has deterministic operational truth.
 if(/\b(payer|paiement|facture|loyer|echeance)\b/.test(n)){
  return proposal(text,"payment","deterministic",[
   {resourceType:"finance_bill",role:"resolves",label:text,phase:"execute"}
  ],"Une facture reliÃ©e n'est rÃ©solue que lorsque son Ã©tat financier est rÃ©ellement payÃ© avec transaction associÃ©e.");
 }

 // Event preparation is inherently multi-step and outcome-sensitive.
 if(/\b(anniversaire|fete|voyage|demenagement|diner|repas|recevoir|organiser|preparer)\b/.test(n)){
  return proposal(text,"event","human_required",[
   task(`PrÃ©parer : ${text}`,"required","prepare"),calendar(text),task(`RÃ©aliser : ${text}`,"required","execute"),humanConfirm()
  ],"La prÃ©paration et la date ne suffisent pas Ã  prouver que l'objectif rÃ©el a Ã©tÃ© atteint.");
 }

 // Safe fallback: understand it as a household need without pretending certainty.
 return proposal(text,"generic","human_required",[task(text,"required","execute"),humanConfirm()],"DABO peut transformer ce besoin en action, mais conserve une confirmation humaine faute de vÃ©ritÃ© opÃ©rationnelle suffisante.");
}

/** Stable V3 entry point; proposeClosedLoop remains for V1/V2 compatibility. */
export const planClosedLoopNeed=proposeClosedLoop;


