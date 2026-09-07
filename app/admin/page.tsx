"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { Activity, CalendarDays, CheckCircle2, Home, RefreshCw, ShoppingBasket, Users, UserRoundCheck } from "lucide-react";

type Data = { generatedAt:string; admin:string; kpis:Record<string,number>; recentHouseholds:{id:string;name:string;created_at:string;members:number}[] };
const labels: Record<string,[string,string]> = {
 users:["Utilisateurs","Comptes présents dans au moins un foyer"], households:["Foyers","Foyers créés au total"], activeHouseholds30:["Foyers actifs · 30 j","Activité tâche, course, calendrier ou contribution"],
 newUsers30:["Nouveaux · 30 j","Utilisateurs arrivés sur les 30 derniers jours"], multiHouseholdUsers:["Utilisateurs multi-foyers","Présents dans au moins deux foyers"],
 tasksCompleted30:["Tâches terminées · 30 j","Valeur réellement accomplie"], shoppingBought30:["Courses achetées · 30 j","Articles marqués achetés"], eventsCreated30:["Événements créés · 30 j","Usage du calendrier"],
};
const icons=[Users,Home,Activity,UserRoundCheck,Users,CheckCircle2,ShoppingBasket,CalendarDays];
export default function AdminPage(){
 const [data,setData]=useState<Data|null>(null), [error,setError]=useState(""), [loading,setLoading]=useState(true);
 const load=async()=>{setLoading(true);setError(""); const supabase=createClient(); const {data:s}=await supabase.auth.getSession(); if(!s.session){location.href="/";return;} const r=await fetch("/api/admin/dashboard",{headers:{Authorization:`Bearer ${s.session.access_token}`}}); const j=await r.json(); if(!r.ok)setError(j.error||"Erreur"); else setData(j); setLoading(false);};
 useEffect(()=>{load();},[]);
 return <main className="min-h-screen bg-[#E7E3D8] text-ink">
  <header className="border-b border-border bg-paper"><div className="max-w-6xl mx-auto px-5 py-5 flex items-center justify-between"><div><div className="font-mono text-xs uppercase tracking-[.18em] text-mustard">DABO · Back-office</div><h1 className="font-serif text-3xl mt-1">Cockpit administrateur</h1></div><a href="/app" className="text-sm border border-border rounded-xl px-4 py-2 bg-white2">Retour à DABO</a></div></header>
  <div className="max-w-6xl mx-auto px-5 py-8">
   <div className="flex justify-between gap-4 items-end mb-7"><div><h2 className="font-serif text-2xl">Vue d’ensemble</h2><p className="text-muted text-sm mt-1">Pilotage produit et premiers indicateurs de traction.</p></div><button onClick={load} className="flex gap-2 items-center text-sm"><RefreshCw size={15}/>Actualiser</button></div>
   {loading && <div className="bg-paper border border-border rounded-2xl p-6">Chargement des indicateurs…</div>}
   {error && <div className="bg-paper border border-border rounded-2xl p-6"><b>Accès impossible.</b><p className="text-sm text-muted mt-2">{error}</p><p className="text-sm mt-3">Vérifie que ton e-mail est présent dans la variable serveur <code>DABO_ADMIN_EMAILS</code>.</p></div>}
   {data && <><section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{Object.keys(labels).map((key,i)=>{const Icon=icons[i];return <article key={key} className="bg-paper border border-border rounded-2xl p-5"><div className="flex justify-between"><Icon size={19} className="text-mustard"/><span className="font-mono text-xs text-muted">KPI</span></div><div className="font-serif text-4xl mt-5">{data.kpis[key]??0}</div><div className="font-medium mt-2">{labels[key][0]}</div><p className="text-xs text-muted mt-1 leading-relaxed">{labels[key][1]}</p></article>})}</section>
   <section className="grid lg:grid-cols-[1.4fr_.6fr] gap-5 mt-6"><article className="bg-paper border border-border rounded-2xl p-5"><h3 className="font-serif text-xl">Foyers récents</h3><div className="mt-4 divide-y divide-border">{data.recentHouseholds.map(h=><div key={h.id} className="py-3 flex justify-between gap-3"><div><div className="font-medium">{h.name}</div><div className="text-xs text-muted">Créé le {new Date(h.created_at).toLocaleDateString("fr-BE")}</div></div><div className="text-sm">{h.members} membre{h.members!==1?"s":""}</div></div>)}</div></article>
   <article className="bg-[#22301F] text-[#F0EFE6] rounded-2xl p-5"><div className="font-mono text-xs text-[#D8A94A]">LECTURE TRACTION</div><h3 className="font-serif text-xl mt-3">À suivre en priorité</h3><p className="text-sm opacity-80 mt-3 leading-relaxed">Croissance seule ne suffit pas. Les prochaines briques mesureront activation, rétention J7/J30, WAU/MAU et cohortes avant de les présenter comme KPI investisseurs.</p><div className="mt-5 border-t border-white/20 pt-4 text-xs opacity-70">Données actualisées : {new Date(data.generatedAt).toLocaleString("fr-BE")}</div></article></section></>}
  </div>
 </main>;
}
