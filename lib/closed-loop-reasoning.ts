import type{ClosedLoopResourceType,ClosedLoopRole}from"@/lib/closed-loop-engine";
export type ClosedLoopProposalAction={resourceType:ClosedLoopResourceType;role:ClosedLoopRole;label:string};
export type ClosedLoopProposal={needTitle:string;resolutionMode:"deterministic"|"human_required";actions:ClosedLoopProposalAction[];confidence:"rule"|"assisted";requiresApproval:true};
const clean=(v:string)=>v.trim().replace(/\s+/g," ").replace(/[.!?]+$/g,"");
/** Conservative, free rules layer. It proposes; it never writes or resolves anything. */
export function proposeClosedLoop(input:string):ClosedLoopProposal|null{
 const text=clean(input),n=text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();if(!text)return null;
 const buyThen=/\b(?:acheter|prendre|commander)\s+(.+?)\s+(?:puis|et ensuite|avant de)\s+(.+)$/i.exec(text);
 if(buyThen)return{needTitle:clean(buyThen[2]),resolutionMode:"human_required",confidence:"rule",requiresApproval:true,actions:[{resourceType:"shopping_item",role:"required",label:clean(buyThen[1])},{resourceType:"task",role:"required",label:clean(buyThen[2])},{resourceType:"human_confirmation",role:"resolves",label:"Confirmer que le besoin est réglé"}]};
 if(/\b(plus de|manque|acheter|courses?|prendre)\b/.test(n))return{needTitle:text,resolutionMode:"deterministic",confidence:"rule",requiresApproval:true,actions:[{resourceType:"shopping_item",role:"resolves",label:text.replace(/^.*?\bacheter\b\s*/i,"")}]};
 if(/\b(casse|cassee|casser|fuite|panne|reparer|remplacer|probleme)\b/.test(n))return{needTitle:text,resolutionMode:"human_required",confidence:"rule",requiresApproval:true,actions:[{resourceType:"task",role:"progress",label:text},{resourceType:"human_confirmation",role:"resolves",label:"Confirmer que le besoin est réglé"}]};
 return null;
}
