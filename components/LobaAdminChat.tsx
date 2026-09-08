"use client";

import { FormEvent, useMemo, useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";

type Insight = { title: string; observation: string; action: string; metric: string };
type Props = {
  kpis: Record<string, number>;
  insights: Insight[];
  funnel: { step: string; value: number }[];
};

function answer(question: string, kpis: Record<string, number>, insights: Insight[], funnel: Props["funnel"]) {
  const q = question.toLocaleLowerCase("fr");
  const users = kpis.users ?? 0;
  const without = kpis.accountsWithoutHousehold ?? 0;
  const activation = kpis.accountToHouseholdRate ?? 0;
  const active = kpis.activeHouseholds30 ?? 0;
  const households = kpis.households ?? 0;
  const shares = kpis.shares30 ?? 0;

  if (/activation|foyer|inscri/.test(q)) {
    return `L’activation compte → foyer est de ${activation} %. ${without} compte${without > 1 ? "s" : ""} sur ${users} ${without > 1 ? "ne sont" : "n’est"} actuellement rattaché${without > 1 ? "s" : ""} à aucun foyer actif. Ma priorité : simplifier le passage juste après l’inscription et mesurer séparément “créer un foyer” et “rejoindre un foyer”.`;
  }
  if (/croissance|grandir|utilisateur|acquisition|connaître|campagne/.test(q)) {
    const top = insights[0];
    return `Pour faire grandir DABO maintenant, je commencerais par une expérience mesurable et peu intrusive : proposer le partage après un moment utile du foyer. Les partages enregistrés sur 30 jours sont actuellement à ${shares}. ${top ? `Signal prioritaire : ${top.title}. ${top.action}` : "Je continuerais d’abord à construire une base de référence."}`;
  }
  if (/partage|ambassadeur|bouche/.test(q)) {
    return `DABO compte ${kpis.shareUsers30 ?? 0} ambassadeur${(kpis.shareUsers30 ?? 0) > 1 ? "s" : ""} et ${shares} partage${shares > 1 ? "s" : ""} enregistré${shares > 1 ? "s" : ""} sur 30 jours. Je recommande de tester une seule sollicitation contextuelle après une réussite, puis de mesurer partage → visite → inscription → foyer activé.`;
  }
  if (/actif|rétention|retention|revien/.test(q)) {
    const rate = households ? Math.round((active / households) * 100) : 0;
    return `${active} foyer${active > 1 ? "s" : ""} sur ${households} ont eu une activité sur les 30 derniers jours, soit environ ${rate} %. Pour parler réellement de rétention, il faudra ensuite ajouter des cohortes J7/J30 plutôt que confondre activité et rétention.`;
  }
  if (/priorité|priorite|faire aujourd|cette semaine|recommande/.test(q)) {
    const top = insights.slice(0, 3);
    return top.length ? `Mes priorités actuelles : ${top.map((x, i) => `${i + 1}. ${x.title} — ${x.action}`).join(" ")}` : "Je n’ai pas encore assez de données pour établir une priorité fiable.";
  }
  if (/funnel|entonnoir|parcours/.test(q)) {
    return `Le funnel actuel est : ${funnel.map(x => `${x.step} : ${x.value}`).join(" → ")}. Je recommande de travailler d’abord sur la plus forte rupture mesurable avant d’ajouter du volume en haut du funnel.`;
  }
  return `Je peux déjà raisonner sur les données du cockpit. Essaie par exemple : “Quelle est ma priorité cette semaine ?”, “Pourquoi l’activation est-elle à ${activation} % ?”, “Comment faire connaître DABO ?” ou “Analyse le funnel”. Je n’invente pas de données qui ne sont pas encore mesurées.`;
}

export function LobaAdminChat({ kpis, insights, funnel }: Props) {
  const suggestions = useMemo(() => ["Quelle est ma priorité cette semaine ?", "Comment faire connaître DABO ?", "Analyse le funnel"], []);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "loba"; text: string }[]>([
    { role: "loba", text: "Je suis prêt. Pose-moi une question sur les KPI, le funnel ou la croissance de DABO." },
  ]);
  const ask = (text: string) => {
    const clean = text.trim(); if (!clean) return;
    setMessages(m => [...m, { role: "user", text: clean }, { role: "loba", text: answer(clean, kpis, insights, funnel) }]);
    setQuestion("");
  };
  const submit = (e: FormEvent) => { e.preventDefault(); ask(question); };
  return <section className="bg-[#22301F] text-[#F0EFE6] rounded-2xl p-5">
    <div className="flex items-center gap-2"><Bot size={18} className="text-[#D8A94A]"/><div><div className="font-serif text-xl">Parler à LOBA</div><div className="text-xs opacity-65">Conversation fondée sur les données actuelles du cockpit</div></div></div>
    <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">{messages.map((m,i)=><div key={i} className={`text-sm rounded-xl p-3 leading-relaxed ${m.role==="loba"?"bg-white/10":"bg-[#D8A94A] text-[#172117] ml-8"}`}>{m.role==="loba"&&<Sparkles size={13} className="inline mr-2 text-[#D8A94A]"/>}{m.text}</div>)}</div>
    <div className="flex flex-wrap gap-2 mt-3">{suggestions.map(s=><button key={s} onClick={()=>ask(s)} className="text-[11px] border border-white/20 rounded-full px-3 py-1.5 hover:bg-white/10">{s}</button>)}</div>
    <form onSubmit={submit} className="flex gap-2 mt-3"><input value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Demander quelque chose à LOBA…" className="min-w-0 flex-1 rounded-xl bg-white text-[#172117] px-3 py-2.5 text-sm outline-none"/><button className="rounded-xl bg-[#D8A94A] text-[#172117] px-3" aria-label="Envoyer"><Send size={17}/></button></form>
    <p className="text-[10px] opacity-55 mt-3">V4 : LOBA répond ici avec les métriques réellement disponibles. Les actions externes et dépenses restent soumises à autorisation.</p>
  </section>;
}
