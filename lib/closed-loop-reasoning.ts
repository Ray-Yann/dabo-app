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

function extractShoppingNeed(text:string):string|null{
 const patterns=[
  /^(?:il\s+(?:nous\s+)?manque|nous\s+manquons\s+de)\s+(.+)$/i,
  /^(?:il\s+n['\u2019]?\s*y\s+a\s+plus\s+de|il\s+n\s+y\s+a\s+plus\s+de|plus\s+de)\s+(.+)$/i,
  /^(?:nous\s+avons\s+besoin\s+de|on\s+a\s+besoin\s+de|j['\u2019]ai\s+besoin\s+de)\s+(.+)$/i,
  /^(?:acheter|commander|prendre)\s+(.+)$/i
 ];
 for(const pattern of patterns){
  const match=pattern.exec(text);
  if(!match)continue;
  const item=clean(match[1]).replace(/^(?:(?:de\s+la|des|du|de|les|le|la|un|une)\s+|(?:de\s+l|d|l)['\u2019])/i,"").trim();
  if(item&&item.length<=160)return item;
 }
 return null;
}

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
  shopping(extractShoppingNeed(`Acheter ${buyThen[1]}`) ?? buyThen[1]),task(buyThen[2]),humanConfirm()
 ],"Un achat prépare l'action réelle; seule la réalisation de l'action peut mener à la résolution.");

 // Shopping intent: extract an actual product without inventing one.
 const shoppingItem=/^prendre\s+/i.test(text)?null:extractShoppingNeed(text);
 if(shoppingItem&&!/\b(rendez[- ]?vous|rdv)\b/.test(n)){
  return proposal(text,"shopping","deterministic",[{...shopping(shoppingItem,"resolves"),phase:"execute"}],"L'achat demandé est vérifié via Courses; l'ajout à la liste ne prouve pas l'achat.");
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


