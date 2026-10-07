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
const humanConfirm=():ClosedLoopProposalAction=>({resourceType:"human_confirmation",role:"resolves",label:"Confirmer que le besoin est réglé",phase:"verify"});
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
 ],"Un achat prépare l'action réelle; seule la réalisation de l'action peut mener à la résolution.");

 // Shortage / grocery need: buying the missing item is itself deterministic resolution.
 if(/\b(plus de|manque|epuise|rupture|courses?)\b/.test(n)&&!(/\b(fuite|panne|casse|repar|remplac|probleme)\b/.test(n))){
  const label=afterVerb(text,"acheter|prendre|commander");
  return proposal(text,"shopping","deterministic",[{...shopping(label,"resolves"),phase:"execute"}],"Le besoin porte directement sur l'acquisition d'un article; l'état acheté peut donc constituer la vérité de résolution.");
 }
 if(/^\s*(acheter|commander)\b/i.test(text)||(/^\s*prendre\b/i.test(text)&&!/\b(rendez[- ]?vous|rdv)\b/.test(n))){
  const label=afterVerb(text,"acheter|prendre|commander");
  return proposal(text,"shopping","deterministic",[{...shopping(label,"resolves"),phase:"execute"}],"L'achat demandé est une action dont DABO peut vérifier l'achèvement via Courses.");
 }

 // Repair/problem: never invent a part or supplier. Diagnose, act, then verify reality.
 if(/\b(fuit|fuite|fuites|panne|casse|cassee|casser|reparer|reparation|remplacer|probleme|ne marche|ne fonctionne)\b/.test(n)){
  return proposal(text,"repair","human_required",[
   task(`Diagnostiquer : ${text}`,"progress","prepare"),
   task(`Résoudre : ${text}`,"required","execute"),
   humanConfirm()
  ],"Un problème matériel peut nécessiter des étapes inconnues à l'avance; DABO prépare et exécute sans inventer la résolution réelle.");
 }

 // Appointment: scheduling is preparation, attendance/outcome is real-world truth.
 if(/\b(rendez[- ]?vous|rdv|dentiste|medecin|garage|reservation|reserver)\b/.test(n)){
  return proposal(text,"appointment","human_required",[
   calendar(text),task(`Effectuer : ${text}`,"required","execute"),humanConfirm()
  ],"Un événement planifié ne prouve pas qu'il a réellement eu lieu; une vérification humaine reste nécessaire.");
 }

 // Payment/bill: a paid finance bill has deterministic operational truth.
 if(/\b(payer|paiement|facture|loyer|echeance)\b/.test(n)){
  return proposal(text,"payment","deterministic",[
   {resourceType:"finance_bill",role:"resolves",label:text,phase:"execute"}
  ],"Une facture reliée n'est résolue que lorsque son état financier est réellement payé avec transaction associée.");
 }

 // Event preparation is inherently multi-step and outcome-sensitive.
 if(/\b(anniversaire|fete|voyage|demenagement|diner|repas|recevoir|organiser|preparer)\b/.test(n)){
  return proposal(text,"event","human_required",[
   task(`Préparer : ${text}`,"required","prepare"),calendar(text),task(`Réaliser : ${text}`,"required","execute"),humanConfirm()
  ],"La préparation et la date ne suffisent pas à prouver que l'objectif réel a été atteint.");
 }

 // Safe fallback: understand it as a household need without pretending certainty.
 return proposal(text,"generic","human_required",[task(text,"required","execute"),humanConfirm()],"DABO peut transformer ce besoin en action, mais conserve une confirmation humaine faute de vérité opérationnelle suffisante.");
}

/** Stable V3 entry point; proposeClosedLoop remains for V1/V2 compatibility. */
export const planClosedLoopNeed=proposeClosedLoop;


