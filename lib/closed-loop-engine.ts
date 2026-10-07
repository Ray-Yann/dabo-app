export type ClosedLoopResourceType="task"|"shopping_item"|"calendar_event"|"finance_bill"|"finance_transaction"|"human_confirmation";
export type ClosedLoopRole="progress"|"required"|"resolves"|"evidence";
export type ClosedLoopNeedStatus="open"|"in_progress"|"awaiting_confirmation"|"resolved"|"cancelled";
export type ClosedLoopActionState="pending"|"satisfied"|"cancelled"|"missing";
export type ClosedLoopAction={id:string;resourceType:ClosedLoopResourceType;resourceId:string|null;role:ClosedLoopRole;state:ClosedLoopActionState;position:number};
export type ClosedLoopNeed={id:string;title:string;status:ClosedLoopNeedStatus;resolutionMode:"deterministic"|"human_required";actions:ClosedLoopAction[]};
export type ClosedLoopResolution={status:ClosedLoopNeedStatus;resolved:boolean;requiresHumanConfirmation:boolean;remainingRequired:number;reason:"cancelled"|"no_actions"|"waiting"|"human_confirmation"|"resolved"};

/** Pure truth engine. Reasoning/LLMs may propose actions, but never decide resolution. */
export function resolveClosedLoopNeed(need:ClosedLoopNeed):ClosedLoopResolution{
 if(need.status==="cancelled")return{status:"cancelled",resolved:false,requiresHumanConfirmation:false,remainingRequired:0,reason:"cancelled"};
 const active=need.actions.filter(a=>a.state!=="cancelled");
 if(!active.length)return{status:"open",resolved:false,requiresHumanConfirmation:false,remainingRequired:0,reason:"no_actions"};
 const required=active.filter(a=>(a.role==="required"||a.role==="resolves")&&a.resourceType!=="human_confirmation");
 if(!required.length&&need.resolutionMode==="deterministic")return{status:"open",resolved:false,requiresHumanConfirmation:false,remainingRequired:0,reason:"no_actions"};
 const remaining=required.filter(a=>a.state!=="satisfied").length;
 if(remaining>0)return{status:active.some(a=>a.state==="satisfied")?"in_progress":"open",resolved:false,requiresHumanConfirmation:false,remainingRequired:remaining,reason:"waiting"};
 if(need.resolutionMode==="human_required"){
  const confirmation=active.find(a=>a.resourceType==="human_confirmation"&&a.role==="resolves");
  if(!confirmation||confirmation.state!=="satisfied")return{status:"awaiting_confirmation",resolved:false,requiresHumanConfirmation:true,remainingRequired:0,reason:"human_confirmation"};
 }
 return{status:"resolved",resolved:true,requiresHumanConfirmation:false,remainingRequired:0,reason:"resolved"};
}

export function actionStateFromResource(resourceType:ClosedLoopResourceType,resource:{status?:string|null;completed_at?:string|null;bought_at?:string|null;paid_transaction_id?:string|null;confirmed?:boolean|null}|null):ClosedLoopActionState{
 if(!resource)return"missing";
 if(resourceType==="task")return resource.status==="done"&&!!resource.completed_at?"satisfied":"pending";
 if(resourceType==="shopping_item")return resource.status==="bought"&&!!resource.bought_at?"satisfied":"pending";
 if(resourceType==="finance_bill")return resource.status==="paid"&&!!resource.paid_transaction_id?"satisfied":"pending";
 if(resourceType==="finance_transaction")return resource.status==="posted"?"satisfied":"pending";
 if(resourceType==="human_confirmation")return resource.confirmed?"satisfied":"pending";
 // A calendar event is evidence/progress, never proof that the real-world need is resolved.
 return"pending";
}
