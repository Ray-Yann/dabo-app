import {NextRequest,NextResponse} from "next/server";
import {createAdminClient,verifyUserToken} from "@/lib/supabase-admin";
import {ClosedLoopRequestError,readClosedLoopJson} from "@/lib/closed-loop-request";

export const dynamic="force-dynamic";

const record=(x:unknown):x is Record<string,unknown> =>
 !!x&&typeof x==="object"&&!Array.isArray(x);

const uuid=(x:unknown) =>
 typeof x==="string"&&
 /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);

const date=(x:unknown) => {
 if(typeof x!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;
 const d=new Date(`${x}T00:00:00Z`);
 return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===x;
};

export async function POST(req:NextRequest){
 const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||"";
 const user=await verifyUserToken(token);
 if(!user)return NextResponse.json({error:"Session invalide"},{status:401});

 let body:unknown;
 try{body=await readClosedLoopJson(req)}
 catch(e){
  const status=e instanceof ClosedLoopRequestError?e.status:400;
  return NextResponse.json({error:status===413?"Requête trop volumineuse":"Requête invalide"},{status});
 }

 if(!record(body)||!uuid(body.draftId)||!record(body.details)||
    Object.keys(body).some(k=>!["draftId","details"].includes(k)))
  return NextResponse.json({error:"Brouillon invalide"},{status:400});

 const entries=Object.entries(body.details);
 if(entries.length>20)return NextResponse.json({error:"Trop d'actions"},{status:400});

 const details:Record<string,{eventDate?:string;dueOn?:string}>={};
 for(const [position,value] of entries){
  if(!/^(0|[1-9][0-9]*)$/.test(position)||Number(position)>19||!record(value)||
     Object.keys(value).some(k=>!["eventDate","dueOn"].includes(k))||
     (value.eventDate!==undefined&&!date(value.eventDate))||
     (value.dueOn!==undefined&&!date(value.dueOn)))
   return NextResponse.json({error:"Informations invalides"},{status:400});

  details[position]={
   ...(value.eventDate!==undefined?{eventDate:value.eventDate as string}:{}),
   ...(value.dueOn!==undefined?{dueOn:value.dueOn as string}:{})
  };
 }

 const db=createAdminClient();
 const {data,error}=await db.rpc("closed_loop_finalize_draft",{
  p_actor_user_id:user.id,
  p_draft_id:body.draftId,
  p_details:details
 });
 if(error||!record(data)){
  console.error("[closed-loop/finalize-draft]",{code:error?.code});
  return NextResponse.json({error:"Finalisation impossible"},{status:409});
 }
 return NextResponse.json({
  ok:true,
  proposalId:data.proposalId,
  version:data.version,
  replayed:data.replayed===true
 });
}
