import type{ClosedLoopProposal,ClosedLoopProposalAction}from"@/lib/closed-loop-reasoning";

export type ClosedLoopMaterializationAction={
 resourceType:ClosedLoopProposalAction["resourceType"];
 role:ClosedLoopProposalAction["role"];
 label:string;
 position:number;
 eventDate?:string;
 dueOn?:string;
 amount?:number|null;
 category?:"courses"|"logement"|"energie"|"transport"|"abonnements"|"sante"|"enfants"|"loisirs"|"maison"|"autre";
 quantity?:string|null;
};
export type ClosedLoopMaterializationPlan={needTitle:string;resolutionMode:ClosedLoopProposal["resolutionMode"];actions:ClosedLoopMaterializationAction[]};
export type ClosedLoopMaterializationReadiness={ready:boolean;missing:Array<{position:number;field:"eventDate"|"dueOn"}>;plan:ClosedLoopMaterializationPlan};

const isoDate=(v:unknown)=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(`${v}T00:00:00Z`));
/**
 * Converts an approved V3 proposal into the bounded V4 write contract.
 * Missing real-world facts stay missing: this layer never invents dates, money or outcomes.
 */
export function prepareClosedLoopMaterialization(proposal:ClosedLoopProposal,details:Record<number,Partial<ClosedLoopMaterializationAction>>={}):ClosedLoopMaterializationReadiness{
 const missing:ClosedLoopMaterializationReadiness["missing"]=[];
 const actions=proposal.actions.map((action,position)=>{
  const detail=details[position]||{};
  const row:ClosedLoopMaterializationAction={resourceType:action.resourceType,role:action.role,label:action.label,position};
  if(action.resourceType==="calendar_event"){
   if(isoDate(detail.eventDate))row.eventDate=detail.eventDate;else missing.push({position,field:"eventDate"});
  }
  if(action.resourceType==="finance_bill"){
   if(isoDate(detail.dueOn))row.dueOn=detail.dueOn;else missing.push({position,field:"dueOn"});
   if(typeof detail.amount==="number"&&Number.isFinite(detail.amount)&&detail.amount>=0)row.amount=detail.amount;
   if(detail.category)row.category=detail.category;
  }
  if(action.resourceType==="shopping_item"&&typeof detail.quantity==="string"&&detail.quantity.trim())row.quantity=detail.quantity.trim();
  return row;
 });
 return{ready:missing.length===0,missing,plan:{needTitle:proposal.needTitle,resolutionMode:proposal.resolutionMode,actions}};
}

export function validateClosedLoopMaterializationPlan(plan:ClosedLoopMaterializationPlan):string[]{
 const errors:string[]=[];
 if(!plan.needTitle.trim()||plan.needTitle.trim().length>240)errors.push("needTitle");
 if(!["deterministic","human_required"].includes(plan.resolutionMode))errors.push("resolutionMode");
 if(!plan.actions.length||plan.actions.length>20)errors.push("actions");
 plan.actions.forEach((a,i)=>{
  if(a.position!==i)errors.push(`actions.${i}.position`);
  if(!a.label.trim()||a.label.trim().length>240)errors.push(`actions.${i}.label`);
  if(a.resourceType==="calendar_event"&&!isoDate(a.eventDate))errors.push(`actions.${i}.eventDate`);
  if(a.resourceType==="finance_bill"&&!isoDate(a.dueOn))errors.push(`actions.${i}.dueOn`);
  if(a.amount!==undefined&&a.amount!==null&&(!Number.isFinite(a.amount)||a.amount<0))errors.push(`actions.${i}.amount`);
 });
 return errors;
}
