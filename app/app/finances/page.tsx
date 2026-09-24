"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronDown, ChevronLeft, ChevronRight, Pencil, Plus, ReceiptText, WalletCards } from "lucide-react";
import { Header } from "@/components/Header";
import { LoadingState } from "@/components/LoadingState";
import { useHousehold } from "@/lib/use-household";
import { useLanguage, useT } from "@/lib/language-context";
import { notifyBillPaid } from "@/lib/notifications";
import {
  categoryTotals,
  financePeriodLabel,
  financePeriodRange,
  percentageChange,
  previousPeriodRange,
  shiftFinancePeriodAnchor,
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
const CATEGORY_KEYS: Record<string, string> = {
  courses:"finance_category_courses", logement:"finance_category_housing", energie:"finance_category_energy", transport:"finance_category_transport", abonnements:"finance_category_subscriptions",
  sante:"finance_category_health", enfants:"finance_category_children", loisirs:"finance_category_leisure", maison:"finance_category_home", autre:"finance_category_other",
};
const PERIOD_KEYS: Record<FinancePeriod, string> = { week:"finance_period_week", month:"finance_period_month", quarter:"finance_period_quarter", semester:"finance_period_semester", year:"finance_period_year" };
const LOCALES = { fr:"fr-BE", nl:"nl-BE", en:"en-GB", de:"de-DE", es:"es-ES", it:"it-IT", pt:"pt-PT" } as const;

function money(value: number, locale: string) { return new Intl.NumberFormat(locale, { style:"currency", currency:"EUR" }).format(value); }
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

export default function BudgetPage() {
  const { loading, household, me, members, supabase } = useHousehold();
  const t = useT();
  const lang = useLanguage();
  const locale = LOCALES[lang];
  const [transactions,setTransactions]=useState<Transaction[]>([]);
  const [bills,setBills]=useState<Bill[]>([]);
  const [budgets,setBudgets]=useState<Budget[]>([]);
  const [period,setPeriod]=useState<FinancePeriod>("month");
  const [financeSection,setFinanceSection]=useState<"overview"|"expenses"|"bills"|"references">("overview");
  const [periodAnchor,setPeriodAnchor]=useState(()=>new Date());
  const [form,setForm]=useState<FormKind>(null);
  const [editingExpense,setEditingExpense]=useState<Transaction|null>(null);
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

  useEffect(()=>{ load().catch(e=>{console.error(e);setError(t("finance_error_load"));}); },[load]);
  useEffect(()=>{ if(me&&!payer) setPayer(me.id); },[me,payer]);

  const range=useMemo(()=>financePeriodRange(period,periodAnchor),[period,periodAnchor]);
  const previous=useMemo(()=>previousPeriodRange(period,periodAnchor),[period,periodAnchor]);
  const periodLabel=useMemo(()=>financePeriodLabel(period,periodAnchor,locale),[period,periodAnchor,locale]);
  const spent=sumPostedTransactions(transactions,range.start,range.endExclusive);
  const previousSpent=sumPostedTransactions(transactions,previous.start,previous.endExclusive);
  const change=percentageChange(spent,previousSpent);
  const pending=sumPendingBills(bills,range.start,range.endExclusive);
  const commitments=Math.round((spent+pending)*100)/100;
  const monthRange=financePeriodRange("month",periodAnchor);
  const monthCats=categoryTotals(transactions,monthRange.start,monthRange.endExclusive);
  const visibleTx=transactions.filter(t=>t.status==="posted"&&t.occurred_on>=range.start&&t.occurred_on<range.endExclusive).slice(0,8);
  const visibleBills=bills.filter(b=>b.status==="pending"&&b.due_on>=range.start&&b.due_on<range.endExclusive).slice(0,8);

  function reset(next:FormKind=null){setForm(next);setEditingExpense(null);setLabel("");setAmount("");setCategory("autre");setDate(todayKey());setPayer(me?.id||"");setBillRecurrence("once");setError(null);}
  function startExpenseEdit(tx:Transaction){
    setEditingExpense(tx);
    setForm("expense");
    setLabel(tx.label);
    setAmount(money(Number(tx.amount), locale));
    setCategory(tx.category);
    setDate(tx.occurred_on);
    setPayer(tx.paid_by_member_id||me?.id||"");
    setBillRecurrence("once");
    setError(null);
  }
  function parsedAmount(){ return parseMoneyInput(amount); }

  async function save(){
    if(!household||!me||busy) return; const value=parsedAmount();
    if(!value){setError(t("finance_error_amount"));return;}
    if(form!=="reference"&&!label.trim()){setError(t("finance_error_label"));return;}
    setBusy(true);setError(null);
    try{
      if(form==="expense"){
        if(editingExpense){
          const {error:e}=await supabase.from("finance_transactions").update({paid_by_member_id:payer||me.id,amount:value,category,label:label.trim(),occurred_on:date}).eq("id",editingExpense.id).eq("household_id",household.id); if(e)throw e;
        } else {
          const {error:e}=await supabase.from("finance_transactions").insert({household_id:household.id,created_by_member_id:me.id,paid_by_member_id:payer||me.id,amount:value,currency:"EUR",category,label:label.trim(),occurred_on:date,source:"manual",status:"posted",visibility:"household"}); if(e)throw e;
        }
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
    }catch(e){console.error(e);setError(t("finance_error_save"));}finally{setBusy(false);}
  }

  async function markPaid(bill:Bill){
    if(!household||!me||busy)return; setBusy(true);setError(null);
    try{
      const {error:e}=await supabase.rpc("pay_finance_bill",{p_bill_id:bill.id,p_paid_by_member_id:payer||me.id,p_paid_on:todayKey()}); if(e)throw e; void notifyBillPaid(supabase,household.id,me.id,bill.id); setPayingBill(null); await load();
    }catch(e){console.error(e);setError(t("finance_error_mark_paid"));}finally{setBusy(false);}
  }

  if(loading||!household||!me)return <LoadingState/>;

  return <div className="pb-8">
    <Header eyebrow={t("finance_eyebrow")} title={t("tab_finances")} />
    <div className="mx-5 mb-5">
      <label className="block text-xs font-medium text-muted">{t("finance_view_label")}
        <select value={financeSection} onChange={e=>setFinanceSection(e.target.value as typeof financeSection)} className="mt-2 w-full rounded-2xl border border-borderLight bg-paper px-4 py-3 text-sm font-semibold text-ink shadow-sm outline-none">
          <option value="overview">{t("finance_view_overview")}</option>
          <option value="expenses">{t("finance_view_expenses")}</option>
          <option value="bills">{t("finance_view_bills")}</option>
          <option value="references">{t("finance_view_references")}</option>
        </select>
      </label>
    </div>

    {financeSection==="overview"&&<>
    <section className="mx-5 rounded-3xl border border-borderLight bg-paper p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-muted">{periodLabel}</p><h2 className="mt-1 font-serif text-xl">{t("finance_household_status")}</h2></div>
        <div className="relative"><select value={period} onChange={e=>setPeriod(e.target.value as FinancePeriod)} className="appearance-none rounded-xl border border-borderLight bg-paper py-2 pl-3 pr-8 text-xs font-semibold"><option value="week">{t(PERIOD_KEYS.week)}</option><option value="month">{t(PERIOD_KEYS.month)}</option><option value="year">{t(PERIOD_KEYS.year)}</option><option value="quarter">{t(PERIOD_KEYS.quarter)}</option><option value="semester">{t(PERIOD_KEYS.semester)}</option></select><ChevronDown size={14} className="pointer-events-none absolute right-2 top-2.5 text-muted"/></div></div>
      <div className="mt-4 grid grid-cols-[44px_1fr_44px] items-center gap-2" aria-label={t("finance_period_navigation")}>
        <button type="button" onClick={()=>setPeriodAnchor(current=>shiftFinancePeriodAnchor(period,current,-1))} aria-label={t("finance_period_previous")} className="flex h-11 items-center justify-center rounded-xl border border-borderLight bg-white2 text-ink"><ChevronLeft size={18}/></button>
        <button type="button" onClick={()=>setPeriodAnchor(new Date())} className="min-w-0 rounded-xl border border-borderLight bg-white2 px-3 py-2 text-center text-sm font-semibold text-ink"><span className="block truncate">{periodLabel}</span><span className="block text-[10px] font-normal text-muted">{t("finance_back_today")}</span></button>
        <button type="button" onClick={()=>setPeriodAnchor(current=>shiftFinancePeriodAnchor(period,current,1))} aria-label={t("finance_period_next")} className="flex h-11 items-center justify-center rounded-xl border border-borderLight bg-white2 text-ink"><ChevronRight size={18}/></button>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metric label={t("finance_spent")} value={money(spent, locale)} note={change===null?t("finance_no_comparison"):change===0?t("finance_stable_previous"):`${change>0?"+":""}${change}% ${t("finance_vs_previous")}`}/>
        <Metric label={t("finance_still_to_pay")} value={money(pending, locale)} note={`${visibleBills.length} ${visibleBills.length===1?t("finance_bill_singular"):t("finance_bill_plural")} ${t("finance_in_period")}`}/>
        <Metric label={t("finance_known_commitments")} value={money(commitments, locale)} note={t("finance_commitments_note")}/>
      </div>
    </section>

    {error&&<div className="mx-5 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

    <div className="mx-5 mt-5 grid grid-cols-3 gap-2">
      <ActionButton onClick={()=>reset("expense")} label={t("finance_expense")}/><ActionButton onClick={()=>reset("bill")} label={t("finance_bill")}/><ActionButton onClick={()=>reset("reference")} label={t("finance_reference")}/>
    </div>
    </>}

    {form&&<section className="mx-5 mt-4 rounded-3xl border border-borderLight bg-paper p-5">
      <div className="flex items-center justify-between"><h3 className="font-serif text-lg">{form==="expense"?(editingExpense?t("finance_edit_expense"):t("finance_add_expense")):form==="bill"?t("finance_add_bill"):t("finance_add_reference")}</h3><button onClick={()=>reset()} className="text-sm text-muted">{t("finance_cancel")}</button></div>
      <div className="mt-4 space-y-3">
        {form!=="reference"&&<input value={label} onChange={e=>setLabel(e.target.value)} placeholder={form==="bill"?t("finance_bill_placeholder"):t("finance_expense_placeholder")} className="w-full rounded-2xl border border-borderLight bg-paper px-4 py-3 text-sm outline-none"/>}
        <div className="grid grid-cols-2 gap-3"><input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} onBlur={()=>{const value=parseMoneyInput(amount);if(value!==null)setAmount(money(value, locale));}} placeholder="0,00" aria-label={t("finance_amount_aria")} className="w-full rounded-2xl border border-borderLight bg-paper px-4 py-3 text-sm outline-none"/><select value={category} onChange={e=>setCategory(e.target.value)} className="w-full rounded-2xl border border-borderLight bg-paper px-3 py-3 text-sm">{CATEGORIES.map(c=><option key={c} value={c}>{t(CATEGORY_KEYS[c])}</option>)}</select></div>
        <p className="-mt-1 text-xs text-muted">{t("finance_amount_help")}</p>
        {form!=="reference"&&<div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-xs text-muted">{form==="bill"?t("finance_due_date"):t("finance_date")}<input type="date" value={date} onChange={e=>setDate(e.target.value)} className="mt-1 w-full rounded-2xl border border-borderLight bg-paper px-3 py-3 text-sm text-ink"/></label>{form==="expense"&&<label className="text-xs text-muted">{t("finance_paid_by")}<select value={payer} onChange={e=>setPayer(e.target.value)} className="mt-1 w-full rounded-2xl border border-borderLight bg-paper px-3 py-3 text-sm text-ink">{members.map(m=><option key={m.id} value={m.id}>{m.first_name}{m.id===me.id?` (${t("finance_me")})`:""}</option>)}</select></label>}</div>}
        {form==="bill"&&<div className="rounded-2xl border border-borderLight bg-white2 p-3"><p className="text-xs font-medium text-ink">{t("finance_recurrence")}</p><div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">{([['once','finance_once'],['monthly','finance_monthly'],['yearly','finance_yearly']] as const).map(([value,text])=><button type="button" key={value} onClick={()=>setBillRecurrence(value)} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${billRecurrence===value?'border-ink bg-ink text-paper':'border-borderLight bg-paper text-ink'}`}>{t(text)}</button>)}</div>{billRecurrence!=="once"&&<p className="mt-2 text-xs leading-relaxed text-muted">{t("finance_recurrence_help")}</p>}</div>}
        <button disabled={busy} onClick={save} className="w-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-paper disabled:opacity-50">{busy?t("finance_saving"):editingExpense?t("finance_save_changes"):t("finance_save")}</button>
      </div>
    </section>}

    {payingBill&&<section className="mx-5 mt-4 rounded-3xl border border-borderLight bg-paper p-5">
      <h3 className="font-serif text-lg">{t("finance_mark_paid_title").replace("{label}", payingBill.label)}</h3>
      <p className="mt-1 text-sm text-muted">{t("finance_mark_paid_help").replace("{amount}", money(Number(payingBill.amount||0), locale))}</p>
      <label className="mt-4 block text-xs text-muted">{t("finance_paid_by")}<select value={payer} onChange={e=>setPayer(e.target.value)} className="mt-1 w-full rounded-2xl border border-borderLight bg-paper px-3 py-3 text-sm text-ink">{members.map(m=><option key={m.id} value={m.id}>{m.first_name}{m.id===me.id?` (${t("finance_me")})`:""}</option>)}</select></label>
      <div className="mt-4 grid grid-cols-2 gap-2"><button disabled={busy} onClick={()=>setPayingBill(null)} className="rounded-2xl border border-borderLight px-4 py-3 text-sm font-semibold">{t("finance_cancel")}</button><button disabled={busy} onClick={()=>markPaid(payingBill)} className="rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-paper disabled:opacity-50">{busy?t("finance_saving"):t("finance_confirm")}</button></div>
    </section>}

    {financeSection==="expenses"&&<>
    <Section title={t("finance_expenses")} icon={<WalletCards size={18}/>} empty={t("finance_no_expenses")}>
      {visibleTx.map(tx=><Row key={tx.id} editLabel={t("finance_edit")} title={tx.label} subtitle={`${t(CATEGORY_KEYS[tx.category])} · ${new Date(tx.occurred_on+"T12:00:00").toLocaleDateString(locale)}`} value={money(Number(tx.amount), locale)} onEdit={()=>startExpenseEdit(tx)}/>) }
    </Section>
    </>}
    {financeSection==="bills"&&<>
    <Section title={t("finance_upcoming_bills")} icon={<ReceiptText size={18}/>} empty={t("finance_no_bills")}>
      {visibleBills.map(b=><div key={b.id} className="flex items-center gap-3 border-t border-borderLight/70 py-3 first:border-0"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{b.label}</p><p className="text-xs text-muted">{t("finance_due_date")} {new Date(b.due_on+"T12:00:00").toLocaleDateString(locale)}{b.series_id?` · ${t("finance_recurring")}`:""}</p></div><div className="text-right"><p className="text-sm font-semibold">{money(Number(b.amount||0), locale)}</p><button disabled={busy} onClick={()=>{setPayer(me.id);setPayingBill(b);}} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink"><Check size={13}/> {t("finance_mark_paid")}</button></div></div>)}
    </Section>
    </>}
    {financeSection==="references"&&<>
    <Section title={t("finance_monthly_references")} icon={<ArrowLeft className="rotate-180" size={18}/>} empty={t("finance_no_references")}>
      {budgets.map(b=>{const used=monthCats[b.category]||0;const pct=Math.min(100,Math.round((used/Number(b.monthly_reference))*100));return <div key={b.id} className="border-t border-borderLight/70 py-3 first:border-0"><div className="flex justify-between gap-3 text-sm"><span className="font-medium">{t(CATEGORY_KEYS[b.category])}</span><span>{money(used, locale)} / {money(Number(b.monthly_reference), locale)}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white2"><div className="h-full rounded-full bg-ink" style={{width:`${pct}%`}}/></div></div>})}
    </Section>
    </>}
    <p className="mx-5 mt-5 text-xs leading-relaxed text-muted">{t("finance_philosophy")}</p>
  </div>;
}

function Metric({label,value,note}:{label:string;value:string;note:string}){return <div className="rounded-2xl bg-white2 p-4"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-[11px] leading-snug text-muted">{note}</p></div>}
function ActionButton({onClick,label}:{onClick:()=>void;label:string}){return <button onClick={onClick} className="flex items-center justify-center gap-1 rounded-2xl border border-borderLight bg-paper px-2 py-3 text-xs font-semibold shadow-sm"><Plus size={15}/>{label}</button>}
function Section({title,icon,empty,children}:{title:string;icon:React.ReactNode;empty:string;children:React.ReactNode}){const has=Array.isArray(children)?children.length>0:!!children;return <section className="mx-5 mt-5 rounded-3xl border border-borderLight bg-paper p-5"><div className="mb-2 flex items-center gap-2"><span className="text-muted">{icon}</span><h3 className="font-serif text-lg">{title}</h3></div>{has?children:<p className="py-4 text-sm text-muted">{empty}</p>}</section>}
function Row({title,subtitle,value,onEdit,editLabel}:{title:string;subtitle:string;value:string;onEdit?:()=>void;editLabel:string}){return <div className="flex items-center gap-2 border-t border-borderLight/70 py-3 first:border-0"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{title}</p><p className="text-xs text-muted">{subtitle}</p></div><p className="text-sm font-semibold tabular-nums">{value}</p>{onEdit&&<button type="button" onClick={onEdit} aria-label={`${editLabel} ${title}`} title={editLabel} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-white2 hover:text-ink"><Pencil size={14}/></button>}</div>}
