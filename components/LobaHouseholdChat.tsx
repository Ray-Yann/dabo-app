"use client";

import { FormEvent, useState } from "react";
import { MessageCircle, Send, Sparkles } from "lucide-react";
import { useHousehold } from "@/lib/use-household";
import { LobaMarkdown } from "@/components/LobaMarkdown";
import type { LobaAiMessage } from "@/lib/loba-ai";
import type { LobaHouseholdAction } from "@/lib/loba-household-actions";
import { lobaNotificationPlan } from "@/lib/loba-notification-policy";
import { notifyHousehold, notifyMembers, notifyBillPaid } from "@/lib/notifications";

type Props = { householdName: string; initialOpen?: boolean };
type UiMessage = { r:"u"|"l"; t:string };

type ClosedLoopAction = {
 resourceType:"task"|"shopping_item"|"calendar_event"|"finance_bill"|"human_confirmation";
 role:"progress"|"required"|"resolves"|"evidence";
 label:string;
 position:number;
 eventDate?:string;
 dueOn?:string;
};

type ClosedLoopPending = {
 proposalId:string|null;
 version:number|null;
 draftId:string|null;
 plan:{
  needTitle:string;
  resolutionMode:"deterministic"|"human_required";
  actions:ClosedLoopAction[];
 };
 ready:boolean;
 missing:Array<{position:number;field:"eventDate"|"dueOn"}>;
};

export function LobaHouseholdChat({ householdName, initialOpen = false }: Props){
 const { household, me, supabase } = useHousehold();
 const [open,setOpen]=useState(initialOpen),[q,setQ]=useState(""),[messages,setMessages]=useState<UiMessage[]>([]),[busy,setBusy]=useState(false),[pending,setPending]=useState<LobaHouseholdAction|null>(null);
 const [closedLoopPending,setClosedLoopPending]=useState<ClosedLoopPending|null>(null);
 const [closedLoopDates,setClosedLoopDates]=useState<Record<string,string>>({});
 async function token(){const {data}=await supabase.auth.getSession();return data.session?.access_token||null}
 async function ask(x:string){
  const c=x.trim(); if(!c||busy||!household)return;
  const previous=[...messages]; setMessages(m=>[...m,{r:"u",t:c}]); setQ(""); setPending(null); setClosedLoopPending(null); setClosedLoopDates({}); setBusy(true);
  try{
   const access=await token(); if(!access) throw new Error("session");
   const history:LobaAiMessage[]=previous.map(m=>({role:m.r==="u"?"user":"assistant",content:m.t}));
   const res=await fetch("/api/loba/household",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${access}`},body:JSON.stringify({question:c,history,householdId:household.id})});
   const body=await res.json(); if(!res.ok) throw new Error(body.error||"LOBA indisponible");
   setMessages(m=>[...m,{r:"l",t:body.answer}]);
   setClosedLoopPending(body.closedLoop||null);
   setPending(body.closedLoop?null:(body.proposedAction||null));
  }catch(e){setMessages(m=>[...m,{r:"l",t:e instanceof Error&&e.message!=="session"?e.message:"LOBA n’est pas disponible pour le moment."}])}finally{setBusy(false)}
 }
 async function confirmClosedLoop(){
  if(!closedLoopPending||busy)return;
  const current=closedLoopPending;
  setBusy(true);
  try{
   const access=await token();
   if(!access)throw new Error("Session expirée. Reconnecte-toi.");

   let proposalId=current.proposalId;
   let version=current.version;

   if(!current.ready){
    if(!current.draftId)throw new Error("Brouillon indisponible.");
    const details:Record<string,Record<string,string>>={};

    for(const missing of current.missing){
     const key=`${missing.position}:${missing.field}`;
     const value=closedLoopDates[key];
     if(!value)throw new Error("Renseigne toutes les dates demandées.");
     details[String(missing.position)]??={};
     details[String(missing.position)][missing.field]=value;
    }

    const finalized=await fetch("/api/closed-loop/finalize-draft",{
     method:"POST",
     headers:{"Content-Type":"application/json",Authorization:`Bearer ${access}`},
     body:JSON.stringify({draftId:current.draftId,details})
    });
    const result=await finalized.json();
    if(!finalized.ok)throw new Error(result.error||"Finalisation impossible.");
    proposalId=result.proposalId;
    version=result.version;
    setClosedLoopPending(previous=>previous?{...previous,proposalId,version,ready:true,missing:[]}:null);
   }

   if(!proposalId||version!==1)throw new Error("Proposition invalide.");

   const response=await fetch("/api/closed-loop/materialize",{
    method:"POST",
    headers:{"Content-Type":"application/json",Authorization:`Bearer ${access}`},
    body:JSON.stringify({approved:true,proposalId,version})
   });
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||"Confirmation impossible.");

   setClosedLoopPending(null);
   setClosedLoopDates({});
   setMessages(previous=>[...previous,{
    r:"l",
    t:"Le plan a été confirmé et enregistré dans le foyer."
   }]);
  }catch(error){
   setMessages(previous=>[...previous,{
    r:"l",
    t:error instanceof Error?error.message:"Une erreur est survenue."
   }]);
  }finally{
   setBusy(false);
  }
 }
 async function confirm(){
  if(!pending||!household||!me||busy)return; const action=pending; setBusy(true);
  try{
   const access=await token(); if(!access) throw new Error("session");
   const res=await fetch("/api/loba/household",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${access}`},body:JSON.stringify({householdId:household.id,confirmAction:action})});
   const body=await res.json(); if(!res.ok) throw new Error(body.error||"Action impossible");

   const notificationPlan=lobaNotificationPlan({
    action,
    actorMemberId:me.id,
    actorFirstName:me.first_name,
   });

   for(const notification of notificationPlan){
    if(notification.kind==="members"){
     void notifyMembers(
      supabase,
      household.id,
      me.id,
      notification.targetMemberIds,
      notification.key,
      notification.params
     );
    }else if(notification.kind==="household"){
     void notifyHousehold(
      supabase,
      household.id,
      me.id,
      notification.key,
      notification.params
     );
    }else{
     void notifyBillPaid(
      supabase,
      household.id,
      me.id,
      notification.resourceId
     );
    }
   }

   setPending(null);
   const done=action.type==="shopping.add"?`C’est fait : **${action.item}**${action.quantity?` (${action.quantity})`:""} a été ajouté aux courses du foyer.`
    :action.type==="shopping.update"?`C’est fait : **${action.itemName||"l’article"}** a été modifié.`
    :action.type==="shopping.delete"?`C’est fait : **${action.itemName||"l’article"}** a été supprimé des courses.`
    :action.type==="task.add"?`C’est fait : la tâche **${action.name}** a été ajoutée au foyer.`
    :action.type==="task.update"?`C’est fait : **${action.taskName||"la tâche"}** a été modifiée.`
    :action.type==="task.delete"?`C’est fait : **${action.taskName||"la tâche"}** a été supprimée.`
    :action.type==="calendar.add"?`C’est fait : l’événement **${action.title}** a été ajouté ${action.visibility==="personal"?"à ton calendrier personnel":"au calendrier du foyer"}.`
    :action.type==="calendar.update"?`C’est fait : **${action.eventTitle||"l’événement"}** a été modifié.`
    :action.type==="calendar.delete"?`C’est fait : **${action.eventTitle||"l’événement"}** a été supprimé.`
    :action.type==="finance.expense.add"?`C’est fait : la dépense **${action.label}** de **${action.amount.toFixed(2)} €** a été enregistrée.`
    :action.type==="finance.bill.add"?`C’est fait : la facture **${action.label}** de **${action.amount.toFixed(2)} €** a été ajoutée.`
    :`C’est fait : la facture **${action.billLabel||"sélectionnée"}** a été marquée comme payée.`;
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
  if(a.type==="calendar.delete")return <>Supprimer définitivement l’événement <strong>{a.eventTitle||"cet événement"}</strong> ({a.visibility==="personal"?"personnel":"foyer"}) ?</>;
  if(a.type==="finance.expense.add")return <>Enregistrer la dépense <strong>{a.label}</strong> · <strong>{a.amount.toFixed(2)} €</strong> · {a.category} · {a.occurredOn} ?</>;
  if(a.type==="finance.bill.add")return <>Ajouter la facture <strong>{a.label}</strong> · <strong>{a.amount.toFixed(2)} €</strong> · échéance {a.dueOn} ?</>;
  return <>Marquer la facture <strong>{a.billLabel||"sélectionnée"}</strong> comme payée le {a.paidOn} ?</>;
 }
 const submit=(e:FormEvent)=>{e.preventDefault();void ask(q)};
 return <div className="mx-5 mb-5">{!open?<button onClick={()=>setOpen(true)} className="w-full rounded-2xl border border-border bg-white2 p-3.5 flex items-center justify-between text-left"><span className="flex items-center gap-2 text-sm font-medium"><MessageCircle size={17} className="text-mustard"/>Parler à LOBA</span><span className="text-xs text-muted">Assistant du foyer</span></button>:<div className="rounded-2xl bg-[#22301F] text-[#F0EFE6] p-4"><div className="flex justify-between items-center"><div className="flex items-center gap-2 font-semibold"><Sparkles size={16} className="text-[#D8A94A]"/>LOBA</div><button onClick={()=>setOpen(false)} className="text-xs opacity-60">Fermer</button></div><div className="mt-3 max-h-[50vh] overflow-y-auto space-y-2">{messages.length===0&&<div className="text-sm opacity-75">Je peux lire le foyer « {householdName} », préparer des ajouts, modifications et suppressions. Toute action demande ta confirmation.</div>}{messages.map((m,i)=><div key={i} className={`text-sm rounded-xl p-3 ${m.r==="l"?"bg-white/10":"bg-[#D8A94A] text-[#172117] ml-8"}`}>{m.r==="l"?<LobaMarkdown text={m.t}/>:m.t}</div>)}{closedLoopPending&&<div data-testid="closed-loop-confirmation" className="rounded-xl border border-[#D8A94A]/50 bg-[#F0EFE6] p-4 text-[#22301F] text-sm">
 <div className="flex items-center gap-2 font-semibold">
  <Sparkles size={16} className="text-[#99701F]"/>
  Plan proposé par LOBA
 </div>
 <p className="mt-2 font-medium">{closedLoopPending.plan.needTitle}</p>
 <div className="mt-3 space-y-2">
  {closedLoopPending.plan.actions.map(action=><div key={action.position} className="rounded-lg bg-white/75 p-3">
   <div className="flex items-start gap-2">
    <span className="text-[#99701F]">•</span>
    <span>{action.label}</span>
   </div>
   {closedLoopPending.missing.filter(item=>item.position===action.position).map(item=><label key={`${item.position}:${item.field}`} className="mt-2 block">
    <span className="mb-1 block text-xs font-medium">{item.field==="eventDate"?"Date de l'événement":"Date d'échéance"}</span>
    <input
     type="date"
     required
     value={closedLoopDates[`${item.position}:${item.field}`]||""}
     onChange={event=>setClosedLoopDates(previous=>({...previous,[`${item.position}:${item.field}`]:event.target.value}))}
     disabled={busy}
     className="w-full rounded-lg border border-[#22301F]/20 bg-white px-3 py-2 text-[#22301F] disabled:opacity-50"
    />
   </label>)}
  </div>)}
 </div>
 <p className="mt-3 text-xs text-[#22301F]/75">Aucune action ne sera créée sans ta confirmation.</p>
 <div className="mt-3 flex flex-wrap gap-2">
  <button
   type="button"
   disabled={busy||closedLoopPending.missing.some(item=>!closedLoopDates[`${item.position}:${item.field}`])}
   onClick={()=>void confirmClosedLoop()}
   className="rounded-lg bg-[#22301F] px-4 py-2 font-semibold text-[#F0EFE6] disabled:opacity-40"
  >Confirmer le plan</button>
  <button
   type="button"
   disabled={busy}
   onClick={()=>{setClosedLoopPending(null);setClosedLoopDates({});}}
   className="rounded-lg border border-[#22301F]/25 px-4 py-2 disabled:opacity-50"
  >Annuler</button>
 </div>
</div>}{pending&&<div className="rounded-xl border border-[#D8A94A]/50 bg-white/10 p-3 text-sm"><div className="font-semibold">Confirmer l’action</div><div className="mt-1">{actionText(pending)}</div><div className="mt-3 flex gap-2"><button disabled={busy} onClick={()=>void confirm()} className="rounded-lg bg-[#D8A94A] px-3 py-2 font-semibold text-[#172117] disabled:opacity-50">Confirmer</button><button disabled={busy} onClick={()=>setPending(null)} className="rounded-lg border border-white/20 px-3 py-2 disabled:opacity-50">Annuler</button></div></div>}{busy&&<div className="text-sm rounded-xl p-3 bg-white/10 opacity-70">LOBA prépare…</div>}</div><form onSubmit={submit} className="flex gap-2 mt-3"><input value={q} onChange={e=>setQ(e.target.value)} disabled={busy} placeholder="Écrire à LOBA…" className="min-w-0 flex-1 rounded-xl bg-white text-[#172117] px-3 py-2.5 text-sm outline-none disabled:opacity-60"/><button disabled={busy} className="rounded-xl bg-[#D8A94A] text-[#172117] px-3 disabled:opacity-50"><Send size={16}/></button></form><div className="text-[10px] opacity-55 mt-2">LOBA peut préparer des ajouts, modifications et suppressions. Aucune écriture sans confirmation.</div></div>}</div>;
}






