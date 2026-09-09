"use client";
import { FormEvent,useMemo,useState } from "react";
import { Bot,LoaderCircle,Send,Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { answerLobaAdmin,type LobaContext } from "@/lib/loba-admin-analysis";
import { LobaMarkdown } from "@/components/LobaMarkdown";

type Insight={title:string;observation:string;action:string;metric:string};
type ProductRadarItem={id?:string;title:string;stage?:string;value?:string};
type ChatMessage={role:"user"|"loba";text:string;engine?:"ai"|"local"};
type Props={kpis:Record<string,number>;insights:Insight[];funnel:{step:string;value:number}[];context?:LobaContext;productRadar?:ProductRadarItem[]};

export function LobaAdminChat({kpis,insights,funnel,context,productRadar=[]}:Props){
 const suggestions=useMemo(()=>["Comment va DABO ?","Qu’est-ce qui m’inquiète ?","Quelle est ma priorité cette semaine ?","Prépare un résumé pour un investisseur"],[]);
 const [question,setQuestion]=useState("");
 const [loading,setLoading]=useState(false);
 const [messages,setMessages]=useState<ChatMessage[]>([{role:"loba",text:"Je suis LOBA. Mon moteur analytique garde les chiffres fiables et, lorsque mon moteur IA est connecté, je peux aussi comprendre tes questions, raisonner avec toi et développer des idées produit.",engine:"local"}]);

 const ask=async(text:string)=>{
  const clean=text.trim();if(!clean||loading)return;
  const previous=messages;
  setMessages(m=>[...m,{role:"user",text:clean}]);setQuestion("");setLoading(true);
  try{
   const supabase=createClient();const {data:s}=await supabase.auth.getSession();
   if(!s.session)throw new Error("Session expirée");
   const history=previous.filter(m=>m.text).slice(-8).map(m=>({role:m.role==="loba"?"assistant":"user",content:m.text}));
   const r=await fetch("/api/admin/loba",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${s.session.access_token}`},body:JSON.stringify({question:clean,history,context:{kpis,insights,funnel,growth:context?.growth,retention:context?.retention,acquisition:context?.acquisition,productRadar}})});
   const j=await r.json();
   if(r.ok&&j.answer){setMessages(m=>[...m,{role:"loba",text:j.answer,engine:"ai"}]);return;}
   const local=answerLobaAdmin(clean,kpis,insights,funnel,context);
   const prefix=j.code==="LOBA_AI_NOT_CONFIGURED"?"IA générative non connectée — réponse du moteur analytique local : ":"Moteur IA momentanément indisponible — réponse analytique locale : ";
   setMessages(m=>[...m,{role:"loba",text:prefix+local,engine:"local"}]);
  }catch{
   const local=answerLobaAdmin(clean,kpis,insights,funnel,context);
   setMessages(m=>[...m,{role:"loba",text:"Moteur IA momentanément indisponible — réponse analytique locale : "+local,engine:"local"}]);
  }finally{setLoading(false)}
 };
 const submit=(e:FormEvent)=>{e.preventDefault();void ask(question)};
 return <section className="bg-[#22301F] text-[#F0EFE6] rounded-2xl p-5"><div className="flex items-center gap-2"><Bot size={18} className="text-[#D8A94A]"/><div><div className="font-serif text-xl">Parler à LOBA</div><div className="text-xs opacity-65">Moteur analytique DABO + conversation IA générative</div></div></div><div className="mt-4 space-y-2 max-h-96 overflow-y-auto">{messages.map((m,i)=><div key={i} className={`text-sm rounded-xl p-3 leading-relaxed ${m.role==="loba"?"bg-white/10":"bg-[#D8A94A] text-[#172117] ml-8"}`}>{m.role==="loba"&&<Sparkles size={13} className="inline mr-2 text-[#D8A94A]"/>}{m.role==="loba"?<LobaMarkdown text={m.text}/>:m.text}{m.role==="loba"&&m.engine==="ai"&&<div className="text-[9px] uppercase tracking-wide opacity-50 mt-2">Réponse IA · données DABO ancrées</div>}</div>)}{loading&&<div className="text-sm rounded-xl p-3 bg-white/10 flex items-center gap-2"><LoaderCircle size={14} className="animate-spin text-[#D8A94A]"/>LOBA réfléchit…</div>}</div><div className="flex flex-wrap gap-2 mt-3">{suggestions.map(s=><button key={s} disabled={loading} onClick={()=>void ask(s)} className="text-[11px] border border-white/20 rounded-full px-3 py-1.5 hover:bg-white/10 disabled:opacity-40">{s}</button>)}</div><form onSubmit={submit} className="flex gap-2 mt-3"><input value={question} onChange={e=>setQuestion(e.target.value)} disabled={loading} placeholder="Parle librement à LOBA…" className="min-w-0 flex-1 rounded-xl bg-white text-[#172117] px-3 py-2.5 text-sm outline-none disabled:opacity-70"/><button disabled={loading||!question.trim()} className="rounded-xl bg-[#D8A94A] text-[#172117] px-3 disabled:opacity-40" aria-label="Envoyer"><Send size={17}/></button></form><p className="text-[10px] opacity-55 mt-3">LOBA ne dépense rien, ne publie rien et ne contacte personne sans autorisation explicite. Si le moteur IA est indisponible, le moteur analytique local reste disponible.</p></section>;
}
