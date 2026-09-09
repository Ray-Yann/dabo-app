"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronDown, Plus, ReceiptText, WalletCards } from "lucide-react";
import { Header } from "@/components/Header";
import { LoadingState } from "@/components/LoadingState";
import { useHousehold } from "@/lib/use-household";
import {
  categoryTotals,
  financePeriodRange,
  percentageChange,
  previousPeriodRange,
  sumPendingBills,
  sumPostedTransactions,
  type FinancePeriod,
} from "@/lib/finance-engine";

type Transaction = {
  id: string; amount: number; occurred_on: string; category: string; label: string;
  status: "posted" | "void"; paid_by_member_id: string | null; currency: string;
};
type Bill = {
  id: string; amount: number | null; due_on: string; category: string; label: string;
  status: "pending" | "paid" | "cancelled"; paid_transaction_id: string | null; currency: string; series_id: string | null;
};
type BillRecurrence = "once" | "monthly" | "yearly";
type Budget = { id: string; category: string; monthly_reference: number; active: boolean; currency: string };
type FormKind = "expense" | "bill" | "reference" | null;

const CATEGORIES = ["courses","logement","energie","transport","abonnements","sante","enfants","loisirs","maison","autre"] as const;
const CATEGORY_LABELS: Record<string, string> = {
  courses:"Courses", logement:"Logement", energie:"Énergie", transport:"Transport", abonnements:"Abonnements",
  sante:"Santé", enfants:"Enfants", loisirs:"Loisirs", maison:"Maison", autre:"Autre",
};
const PERIOD_LABELS: Record<FinancePeriod, string> = { week:"Semaine", month:"Mois", quarter:"Trimestre", semester:"Semestre", year:"Année" };

function money(value: number) { return new Intl.NumberFormat("fr-BE", { style:"currency", currency:"EUR" }).format(value); }
function parseMoneyInput(raw: string) {
  let value = raw.trim().replace(/ /g, "").replace(/\s/g, "").replace(/EUR/gi, "").replace(/€/g, "");
  if (!value) return null;

  const comma = value.lastIndexOf(",");
  const dot = value.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    if (comma > dot) value = value.replace(/\./g, "").replace(",", ".");
    else value = value.replace(/,/g, "");
  } else if (comma >= 0) {
    value = value.replace(",", ".");
  }

  if (!/^\d+(?:\.\d{0,2})?$/.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : null;
}
function todayKey() { return new Date().toISOString().slice(0,10); }
function monthTitle() { const s = new Intl.DateTimeFormat("fr-BE", { month:"long", year:"numeric" }).format(new Date()); return s.charAt(0).toUpperCase()+s.slice(1); }

export default function BudgetPage() {
  const { loading, household, me, members, supabase } = useHousehold();
  const [transactions,setTransactions]=useState<Transaction[]>([]);
  const [bills,setBills]=useState<Bill[]>([]);
  const [budgets,setBudgets]=useState<Budget[]>([]);
  const [period,setPeriod]=useState<FinancePeriod>("month");
  const [form,setForm]=useState<FormKind>(null);
  const [payingBill,setPayingBill]=useState<Bill|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [label,setLabel]=useState(""); const [amount,setAmount]=useState(""); const [category,setCategory]=useState("autre");
  const [date,setDate]=useState(todayKey()); const [payer,setPayer]=useState("");
  const [billRecurrence,setBillRecurrence]=useState<BillRecurrence>("once");

  const load = useCallback(async()=>{
    if(!household) return;
    const [tx,bill,budget]=await Promise.all([
      supabase.from("finance_transactions").select("id,amount,occurred_on,category,label,status,paid_by_member_id,currency").eq("household_id",household.id).order("occurred_on",{ascending:false}),
      supabase.from("finance_bills").select("id,amount,due_on,category,label,status,paid_transaction_id,currency,series_id").eq("household_id",household.id).order("due_on",{ascending:true}),
      supabase.from("finance_budgets").select("id,category,monthly_reference,active,currency").eq("household_id",household.id).eq("active",true).order("category"),
    ]);
    if(tx.error||bill.error||budget.error) throw tx.error||bill.error||budget.error;
    setTransactions((tx.data||[]) as Transaction[]); setBills((bill.data||[]) as Bill[]); setBudgets((budget.data||[]) as Budget[]);
  },[household,supabase]);

  useEffect(()=>{ load().catch(e=>{console.error(e);setError("Impossible de charger les données Finance.");}); },[load]);
  useEffect(()=>{ if(me&&!payer) setPayer(me.id); },[me,payer]);

  const range=useMemo(()=>financePeriodRange(period),[period]);
  const previous=useMemo(()=>previousPeriodRange(period),[period]);
  const spent=sumPostedTransactions(transactions,range.start,range.endExclusive);
  const previousSpent=sumPostedTransactions(transactions,previous.start,previous.endExclusive);
  const change=percentageChange(spent,previousSpent);
  const pending=sumPendingBills(bills,range.start,range.endExclusive);
  const commitments=Math.round((spent+pending)*100)/100;
  const monthRange=financePeriodRange("month");
  const monthCats=categoryTotals(transactions,monthRange.start,monthRange.endExclusive);
  const visibleTx=transactions.filter(t=>t.status==="posted"&&t.occurred_on>=range.start&&t.occurred_on<range.endExclusive).slice(0,8);
  const visibleBills=bills.filter(b=>b.status==="pending"&&b.due_on>=range.start&&b.due_on<range.endExclusive).slice(0,8);

  function reset(next:FormKind=null){setForm(next);setLabel("");setAmount("");setCategory("autre");setDate(todayKey());setPayer(me?.id||"");setBillRecurrence("once");setError(null);}
  function parsedAmount(){ return parseMoneyInput(amount); }

  async function save(){
    if(!household||!me||busy) return; const value=parsedAmount();
    if(!value){setError("Indique un montant supérieur à 0 €.");return;}
    if(form!=="reference"&&!label.trim()){setError("Ajoute un libellé.");return;}
    setBusy(true);setError(null);
    try{
      if(form==="expense"){
        const {error:e}=await supabase.from("finance_transactions").insert({household_id:household.id,created_by_member_id:me.id,paid_by_member_id:payer||me.id,amount:value,currency:"EUR",category,label:label.trim(),occurred_on:date,source:"manual",status:"posted",visibility:"household"}); if(e)throw e;
      } else if(form==="bill"){
        if(billRecurrence==="once"){
          const {error:e}=await supabase.from("finance_bills").insert({household_id:household.id,created_by_member_id:me.id,label:label.trim(),category,amount:value,currency:"EUR",due_on:date,status:"pending",visibility:"household"}); if(e)throw e;
        } else {
          const {error:e}=await supabase.rpc("create_recurring_finance_bill",{p_household_id:household.id,p_created_by_member_id:me.id,p_label:label.trim(),p_category:category,p_amount:value,p_first_due_on:date,p_frequency:billRecurrence}); if(e)throw e;
        }
      } else if(form==="reference"){
        const existing=budgets.find((item)=>item.category===category);
        if(existing){
          const {error:e}=await supabase.from("finance_budgets").update({monthly_reference:value,active:true}).eq("id",existing.id); if(e)throw e;
        } else {
          const {error:e}=await supabase.from("finance_budgets").insert({household_id:household.id,created_by_member_id:me.id,category,monthly_reference:value,currency:"EUR",active:true}); if(e)throw e;
        }
      }
      reset(); await load();
    }catch(e){console.error(e);setError("DABO n’a pas pu enregistrer. Réessaie.");}finally{setBusy(false);}
  }

  async function markPaid(bill:Bill){
    if(!me||busy)return; setBusy(true);setError(null);
    try{
      const {error:e}=await supabase.rpc("pay_finance_bill",{p_bill_id:bill.id,p_paid_by_member_id:payer||me.id,p_paid_on:todayKey()}); if(e)throw e; setPayingBill(null); await load();
    }catch(e){console.error(e);setError("Impossible de marquer cette facture comme payée.");}finally{setBusy(false);}
  }

  if(loading||!household||!me)return <LoadingState/>;

  return <div className="pb-8">
    <Header eyebrow="FINANCE DU FOYER" title="Budget" />
    <div className="mx-5 mb-5 grid grid-cols-2 rounded-2xl bg-white2 p-1">
      <Link href="/app/equilibre" className="rounded-xl px-3 py-2 text-center text-sm font-medium text-muted">Organisation</Link>
      <span className="rounded-xl bg-paper px-3 py-2 text-center text-sm font-semibold text-ink shadow-sm">Budget</span>
    </div>

    <section className="mx-5 rounded-3xl border border-borderLight bg-paper p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-muted">{period==="month"?monthTitle():PERIOD_LABELS[period]}</p><h2 className="mt-1 font-serif text-xl">Où en est le foyer ?</h2></div>
        <div className="relative"><select value={period} onChange={e=>setPeriod(e.target.value as FinancePeriod)} className="appearance-none rounded-xl border border-borderLight bg-paper py-2 pl-3 pr-8 text-xs font-semibold"><option value="week">Semaine</option><option value="month">Mois</option><option value="year">Année</option><option value="quarter">Trimestre</option><option value="semester">Semestre</option></select><ChevronDown size={14} className="pointer-events-none absolute right-2 top-2.5 text-muted"/></div></div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metric label="Déjà dépensé" value={money(spent)} note={change===null?"Pas de comparaison fiable":change===0?"Stable vs période précédente":`${change>0?"+":""}${change}% vs période précédente`}/>
        <Metric label="Encore à payer" value={money(pending)} note={`${visibleBills.length} facture${visibleBills.length>1?"s":""} dans la période`}/>
        <Metric label="Engagements connus" value={money(commitments)} note="Dépensé + factures ouvertes"/>
      </div>
    </section>

    {error&&<div className="mx-5 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

    <div className="mx-5 mt-5 grid grid-cols-3 gap-2">
      <ActionButton onClick={()=>reset("expense")} label="Dépense"/><ActionButton onClick={()=>reset("bill")} label="Facture"/><ActionButton onClick={()=>reset("reference")} label="Repère"/>
    </div>

    {form&&<section className="mx-5 mt-4 rounded-3xl border border-borderLight bg-paper p-5">
      <div className="flex items-center justify-between"><h3 className="font-serif text-lg">{form==="expense"?"Ajouter une dépense":form==="bill"?"Ajouter une facture":"Ajouter un repère mensuel"}</h3><button onClick={()=>reset()} className="text-sm text-muted">Annuler</button></div>
      <div className="mt-4 space-y-3">
        {form!=="reference"&&<input value={label} onChange={e=>setLabel(e.target.value)} placeholder={form==="bill"?"Ex. Internet":"Ex. Courses Delhaize"} className="w-full rounded-2xl border border-borderLight bg-paper px-4 py-3 text-sm outline-none"/>}
        <div className="grid grid-cols-2 gap-3"><input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} onBlur={()=>{const value=parseMoneyInput(amount);if(value!==null)setAmount(money(value));}} placeholder="0,00" aria-label="Montant en euros" className="w-full rounded-2xl border border-borderLight bg-paper px-4 py-3 text-sm outline-none"/><select value={category} onChange={e=>setCategory(e.target.value)} className="w-full rounded-2xl border border-borderLight bg-paper px-3 py-3 text-sm">{CATEGORIES.map(c=><option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}</select></div>
        <p className="-mt-1 text-xs text-muted">Saisis simplement 25 ou 25,50. DABO affiche automatiquement le montant en €.</p>
        {form!=="reference"&&<div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-xs text-muted">{form==="bill"?"Échéance":"Date"}<input type="date" value={date} onChange={e=>setDate(e.target.value)} className="mt-1 w-full rounded-2xl border border-borderLight bg-paper px-3 py-3 text-sm text-ink"/></label>{form==="expense"&&<label className="text-xs text-muted">Payé par<select value={payer} onChange={e=>setPayer(e.target.value)} className="mt-1 w-full rounded-2xl border border-borderLight bg-paper px-3 py-3 text-sm text-ink">{members.map(m=><option key={m.id} value={m.id}>{m.first_name}{m.id===me.id?" (moi)":""}</option>)}</select></label>}</div>}
        {form==="bill"&&<div className="rounded-2xl border border-borderLight bg-white2 p-3"><p className="text-xs font-medium text-ink">Répétition</p><div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">{([['once','Une seule fois'],['monthly','Tous les mois'],['yearly','Tous les ans']] as const).map(([value,text])=><button type="button" key={value} onClick={()=>setBillRecurrence(value)} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${billRecurrence===value?'border-ink bg-ink text-paper':'border-borderLight bg-paper text-ink'}`}>{text}</button>)}</div>{billRecurrence!=="once"&&<p className="mt-2 text-xs leading-relaxed text-muted">DABO créera les prochaines échéances automatiquement à partir de cette date. Pour un jour absent d’un mois, le dernier jour du mois sera utilisé.</p>}</div>}
        <button disabled={busy} onClick={save} className="w-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-paper disabled:opacity-50">{busy?"Enregistrement…":"Enregistrer"}</button>
      </div>
    </section>}

    {payingBill&&<section className="mx-5 mt-4 rounded-3xl border border-borderLight bg-paper p-5">
      <h3 className="font-serif text-lg">Marquer « {payingBill.label} » comme payée</h3>
      <p className="mt-1 text-sm text-muted">DABO créera une seule dépense de {money(Number(payingBill.amount||0))} liée à cette facture pour éviter le double comptage.</p>
      <label className="mt-4 block text-xs text-muted">Payé par<select value={payer} onChange={e=>setPayer(e.target.value)} className="mt-1 w-full rounded-2xl border border-borderLight bg-paper px-3 py-3 text-sm text-ink">{members.map(m=><option key={m.id} value={m.id}>{m.first_name}{m.id===me.id?" (moi)":""}</option>)}</select></label>
      <div className="mt-4 grid grid-cols-2 gap-2"><button disabled={busy} onClick={()=>setPayingBill(null)} className="rounded-2xl border border-borderLight px-4 py-3 text-sm font-semibold">Annuler</button><button disabled={busy} onClick={()=>markPaid(payingBill)} className="rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-paper disabled:opacity-50">{busy?"Enregistrement…":"Confirmer"}</button></div>
    </section>}

    <Section title="Dépenses" icon={<WalletCards size={18}/>} empty="Aucune dépense sur cette période.">
      {visibleTx.map(tx=><Row key={tx.id} title={tx.label} subtitle={`${CATEGORY_LABELS[tx.category]} · ${new Date(tx.occurred_on+"T12:00:00").toLocaleDateString("fr-BE")}`} value={money(Number(tx.amount))}/>) }
    </Section>
    <Section title="Factures à venir" icon={<ReceiptText size={18}/>} empty="Aucune facture à payer sur cette période.">
      {visibleBills.map(b=><div key={b.id} className="flex items-center gap-3 border-t border-borderLight/70 py-3 first:border-0"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{b.label}</p><p className="text-xs text-muted">Échéance {new Date(b.due_on+"T12:00:00").toLocaleDateString("fr-BE")}{b.series_id?" · Récurrente":""}</p></div><div className="text-right"><p className="text-sm font-semibold">{money(Number(b.amount||0))}</p><button disabled={busy} onClick={()=>{setPayer(me.id);setPayingBill(b);}} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink"><Check size={13}/> Marquer payée</button></div></div>)}
    </Section>
    <Section title="Repères mensuels" icon={<ArrowLeft className="rotate-180" size={18}/>} empty="Aucun repère défini. Ils restent facultatifs.">
      {budgets.map(b=>{const used=monthCats[b.category]||0;const pct=Math.min(100,Math.round((used/Number(b.monthly_reference))*100));return <div key={b.id} className="border-t border-borderLight/70 py-3 first:border-0"><div className="flex justify-between gap-3 text-sm"><span className="font-medium">{CATEGORY_LABELS[b.category]}</span><span>{money(used)} / {money(Number(b.monthly_reference))}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white2"><div className="h-full rounded-full bg-ink" style={{width:`${pct}%`}}/></div></div>})}
    </Section>
    <p className="mx-5 mt-5 text-xs leading-relaxed text-muted">Les montants sont des repères pour comprendre le foyer, jamais une note sur ses membres. Organisation et argent restent deux lectures séparées.</p>
  </div>;
}

function Metric({label,value,note}:{label:string;value:string;note:string}){return <div className="rounded-2xl bg-white2 p-4"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-[11px] leading-snug text-muted">{note}</p></div>}
function ActionButton({onClick,label}:{onClick:()=>void;label:string}){return <button onClick={onClick} className="flex items-center justify-center gap-1 rounded-2xl border border-borderLight bg-paper px-2 py-3 text-xs font-semibold shadow-sm"><Plus size={15}/>{label}</button>}
function Section({title,icon,empty,children}:{title:string;icon:React.ReactNode;empty:string;children:React.ReactNode}){const has=Array.isArray(children)?children.length>0:!!children;return <section className="mx-5 mt-5 rounded-3xl border border-borderLight bg-paper p-5"><div className="mb-2 flex items-center gap-2"><span className="text-muted">{icon}</span><h3 className="font-serif text-lg">{title}</h3></div>{has?children:<p className="py-4 text-sm text-muted">{empty}</p>}</section>}
function Row({title,subtitle,value}:{title:string;subtitle:string;value:string}){return <div className="flex items-center gap-3 border-t border-borderLight/70 py-3 first:border-0"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{title}</p><p className="text-xs text-muted">{subtitle}</p></div><p className="text-sm font-semibold tabular-nums">{value}</p></div>}
