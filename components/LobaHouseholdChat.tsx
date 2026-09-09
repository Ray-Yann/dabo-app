"use client";

import { FormEvent, useState } from "react";
import { MessageCircle, Send, Sparkles } from "lucide-react";
import { useHousehold } from "@/lib/use-household";
import { LobaMarkdown } from "@/components/LobaMarkdown";
import type { LobaAiMessage } from "@/lib/loba-ai";

type Props = { householdName: string };
type UiMessage = { r:"u"|"l"; t:string };

export function LobaHouseholdChat({ householdName }: Props){
 const { household, supabase } = useHousehold();
 const [open,setOpen]=useState(false),[q,setQ]=useState(""),[messages,setMessages]=useState<UiMessage[]>([]),[busy,setBusy]=useState(false);
 async function ask(x:string){
  const c=x.trim(); if(!c||busy||!household)return;
  const previous=[...messages]; setMessages(m=>[...m,{r:"u",t:c}]); setQ(""); setBusy(true);
  try{
   const {data}=await supabase.auth.getSession(); const token=data.session?.access_token;
   if(!token) throw new Error("session");
   const history:LobaAiMessage[]=previous.map(m=>({role:m.r==="u"?"user":"assistant",content:m.t}));
   const res=await fetch("/api/loba/household",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({question:c,history,householdId:household.id})});
   const body=await res.json(); if(!res.ok) throw new Error(body.error||"LOBA indisponible");
   setMessages(m=>[...m,{r:"l",t:body.answer}]);
  }catch(e){setMessages(m=>[...m,{r:"l",t:e instanceof Error&&e.message!=="session"?e.message:"LOBA n’est pas disponible pour le moment."}])}finally{setBusy(false)}
 }
 const submit=(e:FormEvent)=>{e.preventDefault();void ask(q)};
 return <div className="mx-5 mb-5">{!open?<button onClick={()=>setOpen(true)} className="w-full rounded-2xl border border-border bg-white2 p-3.5 flex items-center justify-between text-left"><span className="flex items-center gap-2 text-sm font-medium"><MessageCircle size={17} className="text-mustard"/>Parler à LOBA</span><span className="text-xs text-muted">Assistant du foyer</span></button>:<div className="rounded-2xl bg-[#22301F] text-[#F0EFE6] p-4"><div className="flex justify-between items-center"><div className="flex items-center gap-2 font-semibold"><Sparkles size={16} className="text-[#D8A94A]"/>LOBA</div><button onClick={()=>setOpen(false)} className="text-xs opacity-60">Fermer</button></div><div className="mt-3 max-h-[50vh] overflow-y-auto space-y-2">{messages.length===0&&<div className="text-sm opacity-75">Je peux maintenant lire le foyer « {householdName} ». Demande-moi ce qui mérite ton attention, ce qu’il y a cette semaine, les courses en attente ou un résumé du foyer.</div>}{messages.map((m,i)=><div key={i} className={`text-sm rounded-xl p-3 ${m.r==="l"?"bg-white/10":"bg-[#D8A94A] text-[#172117] ml-8"}`}>{m.r==="l"?<LobaMarkdown text={m.t}/>:m.t}</div>)}{busy&&<div className="text-sm rounded-xl p-3 bg-white/10 opacity-70">LOBA regarde le foyer…</div>}</div><form onSubmit={submit} className="flex gap-2 mt-3"><input value={q} onChange={e=>setQ(e.target.value)} disabled={busy} placeholder="Écrire à LOBA…" className="min-w-0 flex-1 rounded-xl bg-white text-[#172117] px-3 py-2.5 text-sm outline-none disabled:opacity-60"/><button disabled={busy} className="rounded-xl bg-[#D8A94A] text-[#172117] px-3 disabled:opacity-50"><Send size={16}/></button></form><div className="text-[10px] opacity-55 mt-2">Phase 1 · Lecture seule du foyer actif. LOBA ne modifie encore aucune donnée.</div></div>}</div>
}
