"use client";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { LoadingState } from "@/components/LoadingState";
import { useHousehold } from "@/lib/use-household";
import { useT } from "@/lib/language-context";
import type { CalendarEvent, ShoppingItem } from "@/lib/types";
import { fetchContributionBalanceData, type ContributionBalanceData } from "@/lib/task-contributions";
import { computeHouseholdWeeklyReport } from "@/lib/household-weekly-report";
export default function HouseholdReportPage(){
 const {loading,household,members,supabase}=useHousehold(); const t=useT();
 const [balance,setBalance]=useState<ContributionBalanceData>({contributions:[],participants:[]}); const [shopping,setShopping]=useState<ShoppingItem[]>([]); const [events,setEvents]=useState<CalendarEvent[]>([]); const [ready,setReady]=useState(false);
 useEffect(()=>{if(!household)return;(async()=>{const [b,s,e]=await Promise.all([fetchContributionBalanceData(supabase,household.id),supabase.from("shopping_items").select("*").eq("household_id",household.id).eq("status","bought"),supabase.from("calendar_events").select("*").eq("household_id",household.id).eq("visibility","household")]);setBalance(b);setShopping((s.data as ShoppingItem[])||[]);setEvents((e.data as CalendarEvent[])||[]);setReady(true)})().catch(err=>{console.error("DABO weekly report load failed",err);setReady(true)});},[household,supabase]);
 const report=useMemo(()=>computeHouseholdWeeklyReport({members,contributions:balance.contributions,participants:balance.participants,shoppingItems:shopping,calendarEvents:events}),[members,balance,shopping,events]);
 if(loading||!household||!ready)return <LoadingState/>;
 const date=(d:Date)=>new Intl.DateTimeFormat(undefined,{day:"numeric",month:"short"}).format(d);
 return <><Header eyebrow={t("weekly_report_eyebrow")} title={t("weekly_report_title")}/><main className="mx-5 space-y-4 pb-28">
  <p className="text-sm text-muted">{date(report.start)} – {date(new Date(report.end.getTime()-86400000))}</p>
  <section className="grid grid-cols-3 gap-2"><Metric value={report.confirmedContributions} label={t("weekly_report_tasks")}/><Metric value={report.boughtItems} label={t("weekly_report_shopping")}/><Metric value={report.householdEvents} label={t("weekly_report_events")}/></section>
  <section className="rounded-2xl border border-borderLight/70 bg-paper p-5"><p className="text-[11px] uppercase tracking-wide text-muted">{t("weekly_report_balance")}</p><h2 className="mt-1 font-serif text-xl text-ink">{t(`weekly_report_balance_${report.balanceLevel}`)}</h2>{report.balanceLevel!=="building"&&<div className="mt-4 space-y-3">{report.memberShares.map(m=><div key={m.memberId}><div className="flex justify-between text-sm"><span>{m.firstName}</span><span>{m.percentage}%</span></div><div className="mt-1 h-2 rounded-full bg-white2 overflow-hidden"><div className="h-full rounded-full bg-mustard" style={{width:`${m.percentage}%`}}/></div></div>)}</div>}<p className="mt-4 text-xs text-muted">{t("weekly_report_balance_note")}</p></section>
  <section className="rounded-2xl border border-borderLight/70 bg-white2/70 p-5"><p className="text-[11px] uppercase tracking-wide text-muted">{t("weekly_report_positive")}</p><p className="mt-2 text-sm text-ink">{t(`weekly_report_celebration_${report.celebration}`).replace("{count}",String(report.confirmedContributions))}</p></section>
  {report.suggestion==="rebalance"&&<section className="rounded-2xl border border-borderLight/70 bg-paper p-5"><p className="text-[11px] uppercase tracking-wide text-muted">{t("weekly_report_suggestion")}</p><p className="mt-2 text-sm text-ink">{t("weekly_report_suggestion_rebalance")}</p><p className="mt-2 text-xs text-muted">{t("weekly_report_suggestion_control")}</p></section>}
 </main></>;
}
function Metric({value,label}:{value:number;label:string}){return <div className="rounded-2xl border border-borderLight/70 bg-paper p-3 text-center"><p className="text-2xl font-semibold text-ink">{value}</p><p className="mt-1 text-[11px] text-muted">{label}</p></div>}
