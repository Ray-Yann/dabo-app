import {ClosedLoopRequestError,readClosedLoopJson} from "@/lib/closed-loop-request";
import {NextRequest,NextResponse} from "next/server";
import {createAdminClient,verifyUserToken} from "@/lib/supabase-admin";
import {validateClosedLoopMaterializationPlan,type ClosedLoopMaterializationPlan} from "@/lib/closed-loop-materialization";

export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TYPES=new Set(["task","shopping_item","calendar_event","finance_bill","human_confirmation"]);
const ROLES=new Set(["progress","required","resolves","evidence"]);
const CATEGORIES=new Set(["courses","logement","energie","transport","abonnements","sante","enfants","loisirs","maison","autre"]);
const ACTION_KEYS=new Set(["resourceType","role","label","position","eventDate","dueOn","amount","category","quantity"]);
const isRecord=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
function parsePlan(value:unknown):ClosedLoopMaterializationPlan|null{
 if(!isRecord(value)||Object.keys(value).some(k=>!["needTitle","resolutionMode","actions"].includes(k))||typeof value.needTitle!=="string"||!Array.isArray(value.actions)||value.actions.length<1||value.actions.length>20)return null;
 if(value.resolutionMode!=="deterministic"&&value.resolutionMode!=="human_required")return null;
 for(const a of value.actions){
  if(!isRecord(a)||Object.keys(a).some(k=>!ACTION_KEYS.has(k))||typeof a.resourceType!=="string"||!TYPES.has(a.resourceType)||typeof a.role!=="string"||!ROLES.has(a.role)||typeof a.label!=="string"||!Number.isInteger(a.position))return null;
  if(a.eventDate!==undefined&&(typeof a.eventDate!=="string"||a.eventDate.length>10))return null;
  if(a.dueOn!==undefined&&(typeof a.dueOn!=="string"||a.dueOn.length>10))return null;
  if(a.amount!==undefined&&a.amount!==null&&typeof a.amount!=="number")return null;
  if(a.category!==undefined&&(typeof a.category!=="string"||!CATEGORIES.has(a.category)))return null;
  if(a.quantity!==undefined&&a.quantity!==null&&(typeof a.quantity!=="string"||a.quantity.length>120))return null;
 }
 const plan=value as ClosedLoopMaterializationPlan;
 if(validateClosedLoopMaterializationPlan(plan).length)return null;
 if(plan.actions.some(a=>a.resourceType==="calendar_event"&&(a.role==="resolves"||a.role==="evidence")))return null;
 if(plan.actions.some(a=>a.resourceType==="human_confirmation")!== (plan.resolutionMode==="human_required"))return null;
 return plan;
}
export async function POST(req:NextRequest){
 const user=await verifyUserToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||"");
 if(!user)return NextResponse.json({error:"Session invalide"},{status:401});
 let body:unknown;try{body=await readClosedLoopJson(req)}catch(error){const status=error instanceof ClosedLoopRequestError?error.status:400;return NextResponse.json({error:status===413?"Requête trop volumineuse":"Requête invalide"},{status})}
 if(!isRecord(body)||typeof body.householdId!=="string"||!UUID.test(body.householdId))return NextResponse.json({error:"Foyer invalide"},{status:400});
 const plan=parsePlan(body.plan);if(!plan)return NextResponse.json({error:"Plan invalide ou incomplet"},{status:400});
 const db=createAdminClient();
 const {data:member,error:memberError}=await db.from("members").select("id").eq("user_id",user.id).eq("household_id",body.householdId).is("left_at",null).maybeSingle();
 if(memberError)return NextResponse.json({error:"Vérification impossible"},{status:500});
 if(!member)return NextResponse.json({error:"Accès refusé"},{status:403});
 const {data,error}=await db.from("closed_loop_proposals").insert({household_id:body.householdId,created_by:member.id,plan}).select("id,version,plan").single();
 if(error){console.error("[closed-loop/proposals]",{code:error.code});return NextResponse.json({error:"Enregistrement impossible"},{status:500})}
 return NextResponse.json({proposalId:data.id,version:data.version,plan:data.plan},{status:201});
}
