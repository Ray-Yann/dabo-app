"use client";

import { FormEvent, useState } from "react";
import { MessageCircle, Send, Sparkles } from "lucide-react";

type Props = { pendingTasks: number; shoppingItems: number; insightSummaries: string[]; householdName: string };

function reply(q: string, p: Props) {
  const s=q.toLocaleLowerCase("fr");
  if (/semaine|aujourd|faire|priorit|gérer|gerer/.test(s)) return p.insightSummaries.length ? `Voici ce qui mérite ton attention : ${p.insightSummaries.join(" • ")}` : `Rien d’important à signaler pour ${p.householdName}. Il reste ${p.pendingTasks} tâche${p.pendingTasks>1?"s":""} en attente et ${p.shoppingItems} article${p.shoppingItems>1?"s":""} à acheter, mais je ne vais pas transformer cela en urgence si ce n’en est pas une.`;
  if (/course|acheter|liste/.test(s)) return `Il y a actuellement ${p.shoppingItems} article${p.shoppingItems>1?"s":""} à acheter dans ce foyer. Je peux t’aider à repérer ce qui mérite vraiment l’attention depuis Aujourd’hui.`;
  if (/tâche|tache/.test(s)) return `Il y a actuellement ${p.pendingTasks} tâche${p.pendingTasks>1?"s":""} en attente. Je privilégie les retards, urgences et échéances du jour plutôt que de tout présenter comme pressant.`;
  if (/stress|charge|souffle|calme/.test(s)) return `Mon rôle est aussi de réduire la charge mentale. Je ne vais pas créer de pression artificielle : s’il n’y a rien d’important, je te le dirai clairement.`;
  return `Je peux déjà t’aider avec le contexte de ce foyer. Essaie : “Qu’est-ce qu’on doit gérer aujourd’hui ?”, “Quelles tâches méritent mon attention ?” ou “Y a-t-il quelque chose à acheter ?”. Mes prochaines versions pourront comprendre davantage de demandes et agir avec ton autorisation.`;
}

export function LobaHouseholdChat(props: Props){
 const [open,setOpen]=useState(false),[q,setQ]=useState(""),[messages,setMessages]=useState<{r:"u"|"l";t:string}[]>([]);
 const ask=(x:string)=>{const c=x.trim();if(!c)return;setMessages(m=>[...m,{r:"u",t:c},{r:"l",t:reply(c,props)}]);setQ("")};
 const submit=(e:FormEvent)=>{e.preventDefault();ask(q)};
 return <div className="mx-5 mb-5">{!open?<button onClick={()=>setOpen(true)} className="w-full rounded-2xl border border-border bg-white2 p-3.5 flex items-center justify-between text-left"><span className="flex items-center gap-2 text-sm font-medium"><MessageCircle size={17} className="text-mustard"/>Parler à LOBA</span><span className="text-xs text-muted">Assistant du foyer</span></button>:<div className="rounded-2xl bg-[#22301F] text-[#F0EFE6] p-4"><div className="flex justify-between items-center"><div className="flex items-center gap-2 font-semibold"><Sparkles size={16} className="text-[#D8A94A]"/>LOBA</div><button onClick={()=>setOpen(false)} className="text-xs opacity-60">Fermer</button></div><div className="mt-3 space-y-2">{messages.length===0&&<div className="text-sm opacity-75">Que puis-je t’aider à organiser dans ce foyer ?</div>}{messages.map((m,i)=><div key={i} className={`text-sm rounded-xl p-3 ${m.r==="l"?"bg-white/10":"bg-[#D8A94A] text-[#172117] ml-8"}`}>{m.t}</div>)}</div><form onSubmit={submit} className="flex gap-2 mt-3"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Écrire à LOBA…" className="min-w-0 flex-1 rounded-xl bg-white text-[#172117] px-3 py-2.5 text-sm outline-none"/><button className="rounded-xl bg-[#D8A94A] text-[#172117] px-3"><Send size={16}/></button></form><div className="text-[10px] opacity-55 mt-2">LOBA utilise uniquement le contexte de ce foyer affiché dans DABO.</div></div>}</div>
}
