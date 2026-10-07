import {NextRequest,NextResponse} from"next/server";
import {createAdminClient,verifyUserToken} from"@/lib/supabase-admin";
import {validateClosedLoopMaterializationPlan,type ClosedLoopMaterializationPlan} from"@/lib/closed-loop-materialization";

export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESOURCE_TYPES=new Set(["task","shopping_item","calendar_event","finance_bill","human_confirmation"]);
const ROLES=new Set(["progress","required","resolves","evidence"]);
const CATEGORIES=new Set(["courses","logement","energie","transport","abonnements","sante","enfants","loisirs","maison","autre"]);
const ACTION_KEYS=new Set(["resourceType","role","label","position","eventDate","dueOn","amount","category","quantity"]);
const PLAN_KEYS=new Set(["needTitle","resolutionMode","actions"]);

function isRecord(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==="object"&&!Array.isArray(value)}
function parsePlan(value:unknown):ClosedLoopMaterializationPlan|null{
 if(!isRecord(value)||Object.keys(value).some(k=>!PLAN_KEYS.has(k))||typeof value.needTitle!=="string"||!Array.isArray(value.actions))return null;
 if(value.resolutionMode!=="deterministic"&&value.resolutionMode!=="human_required")return null;
 const actions=[] as ClosedLoopMaterializationPlan["actions"];
 for(const raw of value.actions){
  if(!isRecord(raw)||Object.keys(raw).some(k=>!ACTION_KEYS.has(k)))return null;
  if(typeof raw.resourceType!=="string"||!RESOURCE_TYPES.has(raw.resourceType)||typeof raw.role!=="string"||!ROLES.has(raw.role)||typeof raw.label!=="string"||!Number.isInteger(raw.position))return null;
  if(raw.eventDate!==undefined&&typeof raw.eventDate!=="string")return null;
  if(raw.dueOn!==undefined&&typeof raw.dueOn!=="string")return null;
  if(raw.amount!==undefined&&raw.amount!==null&&typeof raw.amount!=="number")return null;
  if(raw.category!==undefined&&(typeof raw.category!=="string"||!CATEGORIES.has(raw.category)))return null;
  if(raw.quantity!==undefined&&raw.quantity!==null&&typeof raw.quantity!=="string")return null;
  actions.push(raw as ClosedLoopMaterializationPlan["actions"][number]);
 }
 const plan:ClosedLoopMaterializationPlan={needTitle:value.needTitle,resolutionMode:value.resolutionMode,actions};
 if(validateClosedLoopMaterializationPlan(plan).length)return null;
 if(plan.actions.some(a=>a.resourceType==="calendar_event"&&(a.role==="resolves"||a.role==="evidence")))return null;
 if(plan.actions.some(a=>a.resourceType==="human_confirmation")&&plan.resolutionMode!=="human_required")return null;
 if(plan.resolutionMode==="human_required"&&!plan.actions.some(a=>a.resourceType==="human_confirmation"))return null;
 return plan;
}

export async function POST(req:NextRequest){
 const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||"";
 const user=await verifyUserToken(token);if(!user)return NextResponse.json({error:"Session invalide"},{status:401});
 let body:unknown;try{body=await req.json()}catch{return NextResponse.json({error:"Requête invalide"},{status:400})}
 if(!isRecord(body)||body.approved!==true||typeof body.householdId!=="string"||typeof body.requestId!=="string"||!UUID.test(body.householdId)||!UUID.test(body.requestId))return NextResponse.json({error:"Confirmation invalide"},{status:400});
 const plan=parsePlan(body.plan);if(!plan)return NextResponse.json({error:"Plan Closed Loop invalide"},{status:400});
 const db=createAdminClient();
 const{data:membership,error:membershipError}=await db.from("members").select("id").eq("user_id",user.id).eq("household_id",body.householdId).is("left_at",null).maybeSingle();
 if(membershipError)return NextResponse.json({error:"Vérification du foyer impossible"},{status:500});
 if(!membership)return NextResponse.json({error:"Accès à ce foyer refusé"},{status:403});
 const{data,error}=await db.rpc("closed_loop_materialize_plan",{p_actor_user_id:user.id,p_household_id:body.householdId,p_request_id:body.requestId,p_plan:plan});
 if(error){console.error("[closed-loop/materialize] RPC failed",{code:error.code,message:error.message,householdId:body.householdId,userId:user.id});return NextResponse.json({error:"DABO n’a pas pu créer ce plan."},{status:409})}
 return NextResponse.json({ok:true,...(isRecord(data)?data:{})});
}
