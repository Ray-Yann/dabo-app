"use client";

import { FormEvent, useState } from "react";
import { MessageCircle, Send, Sparkles } from "lucide-react";
import { useHousehold } from "@/lib/use-household";
import { LobaMarkdown } from "@/components/LobaMarkdown";
import type { LobaAiMessage } from "@/lib/loba-ai";
import type { LobaHouseholdAction } from "@/lib/loba-household-actions";

type Props = { householdName: string };
type UiMessage = { r:"u"|"l"; t:string };

export function LobaHouseholdChat({ householdName }: Props){
 const { household, supabase } = useHousehold();
 const [open,setOpen]=useState(false),[q,setQ]=useState(""),[messages,setMessages]=useState<UiMessage[]>([]),[busy,setBusy]=useState(false),[pending,setPending]=useState<LobaHouseholdAction|null>(null);
 async function token(){const {data}=await supabase.auth.getSession();return data.session?.access_token||null}
 async function ask(x:string){
  const c=x.trim(); if(!c||busy||!household)return;
  const previous=[...messages]; setMessages(m=>[...m,{r:"u",t:c}]); setQ(""); setPending(null); setBusy(true);
  try{
   const access=await token(); if(!access) throw new Error("session");
   const history:LobaAiMessage[]=previous.map(m=>({role:m.r==="u"?"user":"assistant",content:m.t}));
   const res=await fetch("/api/loba/household",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${access}`},body:JSON.stringify({question:c,history,householdId:household.id})});
   const body=await res.json(); if(!res.ok) throw new Error(body.error||"LOBA indisponible");
   setMessages(m=>[...m,{r:"l",t:body.answer}]); setPending(body.proposedAction||null);
  }catch(e){setMessages(m=>[...m,{r:"l",t:e instanceof Error&&e.message!=="session"?e.message:"LOBA n’est pas disponible pour le moment."}])}finally{setBusy(false)}
 }
 async function confirm(){
  if(!pending||!household||busy)return; const action=pending; setBusy(true);
  try{
   const access=await token(); if(!access) throw new Error("session");
   const res=await fetch("/api/loba/household",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${access}`},body:JSON.stringify({householdId:household.id,confirmAction:action})});
   const body=await res.json(); if(!res.ok) throw new Error(body.error||"Action impossible");
   setPending(null);
   const done=action.type==="shopping.add"?`C’est fait : **${action.item}**${action.quantity?` (${action.quantity})`:""} a été ajouté aux courses du foyer.`
    :action.type==="shopping.update"?`C’est fait : **${action.itemName||"l’article"}** a été modifié.`
    :action.type==="shopping.delete"?`C’est fait : **${action.itemName||"l’article"}** a été supprimé des courses.`
    :action.type==="task.add"?`C’est fait : la tâche **${action.name}** a été ajoutée au foyer.`
    :action.type==="task.update"?`C’est fait : **${action.taskName||"la tâche"}** a été modifiée.`
    :action.type==="task.delete"?`C’est fait : **${action.taskName||"la tâche"}** a été supprimée.`
    :action.type==="calendar.add"?`C’est fait : l’événement **${action.title}** a été ajouté ${action.visibility==="personal"?"à ton calendrier personnel":"au calendrier du foyer"}.`
    :action.type==="calendar.update"?`C’est fait : **${action.eventTitle||"l’événement"}** a été modifié.`
    :`C’est fait : **${action.eventTitle||"l’événement"}** a été supprimé.`;
   setMessages(m=>[...m,{r:"l",t:done}]);
  }catch(e){setMessages(m=>[...m,{r:"l",t:e instanceof Error&&e.message!=="session"?e.message:"LOBA n’est pas disponible pour le moment."}])}finally{setBusy(false)}
 }
 function actionText(a:LobaHouseholdAction){
  if(a.type==="shopping.add")return <>Ajouter <strong>{a.item}</strong>{a.quantity?` (${a.quantity})`:""} aux courses de « {householdName} » ?</>;
  if(a.type==="shopping.update")return <>Modifier <strong>{a.itemName||"cet article"}</strong> : <strong>{a.changeSummary}</strong> ?</>;
  if(a.type==="shopping.delete")return <>Supprimer définitivement <strong>{a.itemName||"cet article"}</strong> des courses ?</>;
  if(a.type==="task.add")return <>Ajouter la tâche <strong>{a.name}</strong>{a.dueDate?` · échéance ${a.dueDate}`:""}{` · ${a.durationKey} · effort ${a.effortLevel}`} ?</>;
  if(a.type==="task.update")return <>Modifier <strong>{a.taskName||"cette tâche"}</strong> : <strong>{a.changeSummary}</strong> ?</>;
  if(a.type==="task.delete")return <>Supprimer définitivement la tâche <strong>{a.taskName||"cette tâche"}</strong> ?</>;
  if(a.type==="calendar.add")return <>Ajouter l’événement <strong>{a.title}</strong> le {a.eventDate} {a.visibility==="personal"?"à ton calendrier personnel (privé)":`au calendrier du foyer « ${householdName} »`} ?</>;
  if(a.type==="calendar.update")return <>Modifier <strong>{a.eventTitle||"cet événement"}</strong> ({a.visibility==="personal"?"personnel":"foyer"}) : <strong>{a.changeSummary}</strong> ?</>;
  return <>Supprimer définitivement l’événement <strong>{a.eventTitle||"cet événement"}</strong> ({a.visibility==="personal"?"personnel":"foyer"}) ?</>;
 }
 const submit=(e:FormEvent)=>{e.preventDefault();void ask(q)};
 return <div className="mx-5 mb-5">{!open?<button onClick={()=>setOpen(true)} className="w-full rounded-2xl border border-border bg-white2 p-3.5 flex items-center justify-between text-left"><span className="flex items-center gap-2 text-sm font-medium"><MessageCircle size={17} className="text-mustard"/>Parler à LOBA</span><span className="text-xs text-muted">Assistant du foyer</span></button>:<div className="rounded-2xl bg-[#22301F] text-[#F0EFE6] p-4"><div className="flex justify-between items-center"><div className="flex items-center gap-2 font-semibold"><Sparkles size={16} className="text-[#D8A94A]"/>LOBA</div><button onClick={()=>setOpen(false)} className="text-xs opacity-60">Fermer</button></div><div className="mt-3 max-h-[50vh] overflow-y-auto space-y-2">{messages.length===0&&<div className="text-sm opacity-75">Je peux lire le foyer « {householdName} », préparer des ajouts, modifications et suppressions. Toute action demande ta confirmation.</div>}{messages.map((m,i)=><div key={i} className={`text-sm rounded-xl p-3 ${m.r==="l"?"bg-white/10":"bg-[#D8A94A] text-[#172117] ml-8"}`}>{m.r==="l"?<LobaMarkdown text={m.t}/>:m.t}</div>)}{pending&&<div className="rounded-xl border border-[#D8A94A]/50 bg-white/10 p-3 text-sm"><div className="font-semibold">Confirmer l’action</div><div className="mt-1">{actionText(pending)}</div><div className="mt-3 flex gap-2"><button disabled={busy} onClick={()=>void confirm()} className="rounded-lg bg-[#D8A94A] px-3 py-2 font-semibold text-[#172117] disabled:opacity-50">Confirmer</button><button disabled={busy} onClick={()=>setPending(null)} className="rounded-lg border border-white/20 px-3 py-2 disabled:opacity-50">Annuler</button></div></div>}{busy&&<div className="text-sm rounded-xl p-3 bg-white/10 opacity-70">LOBA prépare…</div>}</div><form onSubmit={submit} className="flex gap-2 mt-3"><input value={q} onChange={e=>setQ(e.target.value)} disabled={busy} placeholder="Écrire à LOBA…" className="min-w-0 flex-1 rounded-xl bg-white text-[#172117] px-3 py-2.5 text-sm outline-none disabled:opacity-60"/><button disabled={busy} className="rounded-xl bg-[#D8A94A] text-[#172117] px-3 disabled:opacity-50"><Send size={16}/></button></form><div className="text-[10px] opacity-55 mt-2">LOBA peut préparer des ajouts, modifications et suppressions. Aucune écriture sans confirmation.</div></div>}</div>;
}
