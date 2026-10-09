import {ClosedLoopRequestError,readClosedLoopJson} from "@/lib/closed-loop-request";
import {NextRequest,NextResponse} from"next/server";
import {createAdminClient,verifyUserToken} from"@/lib/supabase-admin";

export const dynamic="force-dynamic";
const isRecord=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==="object"&&!Array.isArray(value);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(req:NextRequest){
 const user=await verifyUserToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||"");
 if(!user)return NextResponse.json({error:"Session invalide"},{status:401});
 let body:unknown;try{body=await readClosedLoopJson(req)}catch(error){const status=error instanceof ClosedLoopRequestError?error.status:400;return NextResponse.json({error:status===413?"Requête trop volumineuse":"Requête invalide"},{status})}
 // V5.1 deliberately rejects legacy client-supplied plans and approved:true.
 if(!isRecord(body)||body.approved!==true||typeof body.proposalId!=="string"||!UUID.test(body.proposalId)||body.version!==1||Object.keys(body).some(k=>!["approved","proposalId","version"].includes(k)))
  return NextResponse.json({error:"Approbation de proposition invalide"},{status:400});
 const db=createAdminClient();
 const {data,error}=await db.rpc("closed_loop_execute_approved_proposal",{p_actor_user_id:user.id,p_proposal_id:body.proposalId,p_version:body.version});
 if(error){console.error("[closed-loop/materialize]",{code:error.code});return NextResponse.json({error:"Approbation impossible"},{status:409})}
 return NextResponse.json({ok:true,...(isRecord(data)?data:{})});
}
