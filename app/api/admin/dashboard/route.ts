import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { requireDaboAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
const isoAgo = (days:number)=>new Date(Date.now()-days*86400000).toISOString();
const maxIso=(values:(string|null|undefined)[])=>values.filter(Boolean).sort().at(-1)||null;

export async function GET(req:NextRequest){
 const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||"";
 const currentAdmin=await requireDaboAdmin(token);
 if(!currentAdmin) return NextResponse.json({error:"Accès administrateur refusé"},{status:403});
 const db=createAdminClient(), since7=isoAgo(7), since30=isoAgo(30);
 const [households,members,tasks,shopping,events,contributions,auth]=await Promise.all([
  db.from("households").select("id,name,created_at").order("created_at",{ascending:false}),
  db.from("members").select("id,user_id,household_id,first_name,role,created_at,left_at"),
  db.from("tasks").select("id,household_id,status,created_at,completed_at"),
  db.from("shopping_items").select("id,household_id,status,created_at,bought_at"),
  db.from("calendar_events").select("id,household_id,created_at"),
  db.from("task_contributions").select("id,household_id,completed_at,cancelled_at"),
  db.auth.admin.listUsers({page:1,perPage:1000}),
 ]);
 const errors=[households.error,members.error,tasks.error,shopping.error,events.error,contributions.error,auth.error].filter(Boolean);
 if(errors.length) return NextResponse.json({error:"Impossible de charger les données administrateur"},{status:500});
 const H=households.data||[], M=members.data||[], T=tasks.data||[], S=shopping.data||[], E=events.data||[], C=contributions.data||[];
 const active=M.filter(m=>!m.left_at&&m.user_id), userIds=new Set(active.map(m=>m.user_id));
 const multi=new Map<string,number>(); active.forEach(m=>multi.set(m.user_id!, (multi.get(m.user_id!)||0)+1));
 const activityHouseholds=(since:string)=>new Set([
  ...T.filter(x=>x.created_at>=since||(x.completed_at&&x.completed_at>=since)).map(x=>x.household_id),
  ...S.filter(x=>x.created_at>=since||(x.bought_at&&x.bought_at>=since)).map(x=>x.household_id),
  ...E.filter(x=>x.created_at>=since).map(x=>x.household_id),
  ...C.filter(x=>!x.cancelled_at&&x.completed_at>=since).map(x=>x.household_id),
 ]).size;
 const authMap=new Map((auth.data?.users||[]).map(u=>[u.id,u]));
 const householdMap=new Map(H.map(h=>[h.id,h]));
 const users=[...userIds].map(uid=>{
  const ms=active.filter(m=>m.user_id===uid), u=authMap.get(uid!);
  const householdIds=ms.map(m=>m.household_id);
  const lastActivity=maxIso([
   ...T.filter(x=>householdIds.includes(x.household_id)).flatMap(x=>[x.created_at,x.completed_at]),
   ...S.filter(x=>householdIds.includes(x.household_id)).flatMap(x=>[x.created_at,x.bought_at]),
   ...E.filter(x=>householdIds.includes(x.household_id)).map(x=>x.created_at),
   ...C.filter(x=>householdIds.includes(x.household_id)&&!x.cancelled_at).map(x=>x.completed_at),
  ]);
  return {id:uid,email:u?.email||null,firstName:ms[0]?.first_name||"Membre",joinedAt:u?.created_at||ms.map(m=>m.created_at).sort()[0],lastSignInAt:u?.last_sign_in_at||null,lastActivity,households:ms.map(m=>({id:m.household_id,name:householdMap.get(m.household_id)?.name||"Foyer",role:m.role}))};
 }).sort((a,b)=>(b.joinedAt||"").localeCompare(a.joinedAt||""));
 const householdActivity=(id:string)=>maxIso([
  ...T.filter(x=>x.household_id===id).flatMap(x=>[x.created_at,x.completed_at]),
  ...S.filter(x=>x.household_id===id).flatMap(x=>[x.created_at,x.bought_at]),
  ...E.filter(x=>x.household_id===id).map(x=>x.created_at),
  ...C.filter(x=>x.household_id===id&&!x.cancelled_at).map(x=>x.completed_at),
 ]);
 const householdDetails=H.map(h=>({id:h.id,name:h.name,createdAt:h.created_at,lastActivity:householdActivity(h.id),members:active.filter(m=>m.household_id===h.id).map(m=>({id:m.id,userId:m.user_id,firstName:m.first_name,role:m.role,email:authMap.get(m.user_id!)?.email||null})),tasks30:T.filter(x=>x.household_id===h.id&&(x.created_at>=since30||(x.completed_at&&x.completed_at>=since30))).length,shopping30:S.filter(x=>x.household_id===h.id&&(x.created_at>=since30||(x.bought_at&&x.bought_at>=since30))).length,events30:E.filter(x=>x.household_id===h.id&&x.created_at>=since30).length}));
 return NextResponse.json({generatedAt:new Date().toISOString(),admin:currentAdmin.email,kpis:{users:userIds.size,households:H.length,activeMemberships:active.length,multiHouseholdUsers:[...multi.values()].filter(n=>n>1).length,newUsers7:users.filter(u=>u.joinedAt>=since7).length,newUsers30:users.filter(u=>u.joinedAt>=since30).length,activeHouseholds7:activityHouseholds(since7),activeHouseholds30:activityHouseholds(since30),tasksCreated30:T.filter(x=>x.created_at>=since30).length,tasksCompleted30:T.filter(x=>x.completed_at&&x.completed_at>=since30).length,shoppingBought30:S.filter(x=>x.bought_at&&x.bought_at>=since30).length,eventsCreated30:E.filter(x=>x.created_at>=since30).length},recentHouseholds:householdDetails.slice(0,8).map(h=>({id:h.id,name:h.name,created_at:h.createdAt,members:h.members.length})),users,households:householdDetails});
}
