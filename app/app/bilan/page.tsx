"use client";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { LoadingState } from "@/components/LoadingState";
import { useHousehold } from "@/lib/use-household";
import { useT } from "@/lib/language-context";
import type { CalendarEvent, ShoppingItem, Task, TaskSubtask } from "@/lib/types";
import { fetchContributionBalanceData, type ContributionBalanceData } from "@/lib/task-contributions";
import { computeHouseholdWeeklyReport } from "@/lib/household-weekly-report";
import { computeHouseholdInsights } from "@/lib/household-insights";
import { computeHouseholdRecognition } from "@/lib/household-recognition";
import { computeHouseholdIntelligentSummary } from "@/lib/household-intelligent-summary";
import { buildHouseholdActionSuggestion, getRebalanceActionState, type HouseholdAcceptedAction } from "@/lib/household-action-suggestions";
import { computeFullLoadMap } from "@/lib/full-load-map";
import type { MemberLifeContext } from "@/lib/life-context";
import { computePerceptionGap, type LoadPerception } from "@/lib/perception-gap";
export default function HouseholdReportPage(){
 const {loading,household,me,members,supabase}=useHousehold(); const t=useT();
 const [balance,setBalance]=useState<ContributionBalanceData>({contributions:[],participants:[]}); const [shopping,setShopping]=useState<ShoppingItem[]>([]); const [events,setEvents]=useState<CalendarEvent[]>([]); const [tasks,setTasks]=useState<Task[]>([]); const [subtasks,setSubtasks]=useState<TaskSubtask[]>([]); const [acceptedActions,setAcceptedActions]=useState<HouseholdAcceptedAction[]>([]); const [lifeContexts,setLifeContexts]=useState<MemberLifeContext[]>([]); const [loadPerception,setLoadPerception]=useState<LoadPerception|null>(null); const [savingPerception,setSavingPerception]=useState(false); const [ready,setReady]=useState(false); const [confirming,setConfirming]=useState(false); const [saving,setSaving]=useState(false); const [applied,setApplied]=useState(false);
 useEffect(()=>{if(!household)return;(async()=>{const [b,s,e,taskResult,subtaskResult,actionResult,lifeContextResult,perceptionResult]=await Promise.all([fetchContributionBalanceData(supabase,household.id),supabase.from("shopping_items").select("*").eq("household_id",household.id).eq("status","bought"),supabase.from("calendar_events").select("*").eq("household_id",household.id).eq("visibility","household"),supabase.from("tasks").select("*").eq("household_id",household.id),supabase.from("task_subtasks").select("*").eq("household_id",household.id).order("position",{ascending:true}),supabase.from("household_action_suggestions").select("id, household_id, task_id, suggested_member_id, previous_assigned_to, reason, accepted_at").eq("household_id",household.id).order("accepted_at",{ascending:false}).limit(20),supabase.from("member_life_contexts").select("*").eq("household_id",household.id),supabase.from("member_load_perceptions").select("perception, declared_at").eq("household_id",household.id).eq("member_id",me?.id||"").order("declared_at",{ascending:false}).limit(1)]);if(actionResult.error)throw actionResult.error;if(lifeContextResult.error)throw lifeContextResult.error;if(perceptionResult.error)throw perceptionResult.error;setBalance(b);setShopping((s.data as ShoppingItem[])||[]);setEvents((e.data as CalendarEvent[])||[]);setTasks((taskResult.data as Task[])||[]);setSubtasks((subtaskResult.data as TaskSubtask[])||[]);setAcceptedActions((actionResult.data as HouseholdAcceptedAction[])||[]);setLifeContexts((lifeContextResult.data as MemberLifeContext[])||[]);setLoadPerception(((perceptionResult.data?.[0]?.perception as LoadPerception|undefined)??null));setReady(true)})().catch(err=>{console.error("DABO weekly report load failed",err);setReady(true)});},[household,me?.id,supabase]);
 const report=useMemo(()=>computeHouseholdWeeklyReport({members,contributions:balance.contributions,participants:balance.participants,shoppingItems:shopping,calendarEvents:events}),[members,balance,shopping,events]);
 const insights=useMemo(()=>computeHouseholdInsights(members,balance.contributions,balance.participants),[members,balance]);
 const perceptionGap=useMemo(()=>computePerceptionGap({
    perception:loadPerception,
    memberId:me?.id||"",
    memberShares:report.memberShares,
    balanceLevel:report.balanceLevel,
  }),[loadPerception,me,report]);
 const recognition=useMemo(()=>computeHouseholdRecognition(report,insights),[report,insights]);
 const intelligentSummary=useMemo(()=>computeHouseholdIntelligentSummary(report,insights,recognition),[report,insights,recognition]);
 const today=useMemo(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`},[]);
 const fullLoadMap=useMemo(()=>computeFullLoadMap({
    memberIds:members.map(member=>member.id),
    tasks,
    subtasks,
    contributions:balance.contributions,
    participants:balance.participants,
    completedSince:report.start,
    today,
  }),[members,tasks,subtasks,balance,report.start,today]);
  const actionState=useMemo(()=>getRebalanceActionState({report,members,tasks,acceptedActions,contributions:balance.contributions}),[report,members,tasks,acceptedActions,balance.contributions]);
 const rebalanceInProgress=actionState==="in_progress"||actionState==="awaiting_confirmation";
 const actionSuggestion=useMemo(()=>buildHouseholdActionSuggestion({report,members,tasks,today,acceptedActions,contributions:balance.contributions,lifeContexts}),[report,members,tasks,today,acceptedActions,balance.contributions,lifeContexts]);
 async function saveLoadPerception(perception:LoadPerception){
   if(!household||!me||savingPerception)return;
   setSavingPerception(true);
   try{
    const {error}=await supabase.rpc("save_member_load_perception",{
     p_household_id:household.id,
     p_perception:perception,
    });
    if(error)throw error;
    setLoadPerception(perception);
   }catch(error){
    console.error("DABO load perception save failed",error);
   }finally{
    setSavingPerception(false);
   }
  }
  async function applySuggestion(){if(!household||!actionSuggestion||saving)return;setSaving(true);try{const {data,error}=await supabase.rpc("accept_household_action_suggestion",{p_household_id:household.id,p_task_id:actionSuggestion.taskId,p_suggested_member_id:actionSuggestion.suggestedMemberId,p_reason:actionSuggestion.reason});if(error)throw error;setTasks(current=>current.map(task=>task.id===actionSuggestion.taskId?{...task,assigned_to:actionSuggestion.suggestedMemberId}:task));setAcceptedActions(current=>[{id:String(data),household_id:household.id,task_id:actionSuggestion.taskId,suggested_member_id:actionSuggestion.suggestedMemberId,previous_assigned_to:actionSuggestion.currentMemberId,reason:"rebalance",accepted_at:new Date().toISOString()},...current]);setApplied(true);setConfirming(false)}catch(error){console.error("DABO household action suggestion failed",error)}finally{setSaving(false)}}
 if(loading||!household||!ready)return <LoadingState/>;
 const date=(d:Date)=>new Intl.DateTimeFormat(undefined,{day:"numeric",month:"short"}).format(d);
 return <><Header eyebrow={t("weekly_report_eyebrow")} title={t("weekly_report_title")}/><main className="mx-5 space-y-4 pb-28">
  <p className="text-sm text-muted">{date(report.start)} – {date(new Date(report.end.getTime()-86400000))}</p>
  <section className="grid grid-cols-3 gap-2"><Metric value={report.confirmedContributions} label={t("weekly_report_tasks")}/><Metric value={report.boughtItems} label={t("weekly_report_shopping")}/><Metric value={report.householdEvents} label={t("weekly_report_events")}/></section>
  <section className="rounded-2xl border border-borderLight/70 bg-white2/70 p-5"><p className="text-[11px] uppercase tracking-wide text-muted">{t("weekly_report_summary")}</p><h2 className="mt-1 font-serif text-xl text-ink">{t(`weekly_report_summary_${intelligentSummary}_title`)}</h2><p className="mt-2 text-sm text-ink">{t(`weekly_report_summary_${intelligentSummary}_text`).replace("{count}",String(report.confirmedContributions))}</p><p className="mt-3 text-xs text-muted">{t("weekly_report_summary_note")}</p></section>
  <section className="rounded-2xl border border-borderLight/70 bg-paper p-5">
   <p className="text-[11px] uppercase tracking-wide text-muted">{t("full_load_map_title")}</p>
   <h2 className="mt-1 font-serif text-xl text-ink">{t("full_load_map_heading")}</h2>
   <div className="mt-4 grid grid-cols-3 gap-2">
    <div className="rounded-xl bg-white2/70 p-3"><p className="text-[11px] text-muted">{t("full_load_map_carried")}</p><p className="mt-1 font-medium text-ink">{Math.round(fullLoadMap.carriedPoints)} pts</p></div>
    <div className="rounded-xl bg-white2/70 p-3"><p className="text-[11px] text-muted">{t("full_load_map_unassigned")}</p><p className="mt-1 font-medium text-ink">{Math.round(fullLoadMap.unassignedPoints)} pts</p></div>
    <div className="rounded-xl bg-white2/70 p-3"><p className="text-[11px] text-muted">{t("full_load_map_overdue")}</p><p className="mt-1 font-medium text-ink">{Math.round(fullLoadMap.overduePoints)} pts</p></div>
   </div>
   {fullLoadMap.carriedPoints>0?<div className="mt-4 space-y-2">{fullLoadMap.members.filter(item=>item.carriedPoints>0).map(item=>{const member=members.find(candidate=>candidate.id===item.memberId);return <div key={item.memberId} className="flex items-center justify-between rounded-xl bg-white2/70 px-3 py-2"><span className="text-sm text-ink">{member?.first_name||"—"}</span><div className="text-right"><p className="text-sm font-medium text-ink">{Math.round(item.carriedPoints)} pts</p>{item.overduePoints>0&&<p className="text-[11px] text-muted">{t("full_load_map_overdue")}: {Math.round(item.overduePoints)} pts</p>}</div></div>})}</div>:<p className="mt-4 text-sm text-muted">{t("full_load_map_no_current_load")}</p>}
   <div className="mt-4 rounded-xl bg-white2/70 p-3"><div className="flex items-center justify-between"><span className="text-sm text-muted">{t("full_load_map_completed")}</span><span className="text-sm font-medium text-ink">{Math.round(fullLoadMap.completedPoints)} pts</span></div></div>
   <p className="mt-4 text-xs text-muted">{t("full_load_map_note")}</p>
  </section>
  <section className="rounded-2xl border border-borderLight/70 bg-paper p-5"><p className="text-[11px] uppercase tracking-wide text-muted">{t("weekly_report_balance")}</p><h2 className="mt-1 font-serif text-xl text-ink">{t(`weekly_report_balance_${report.balanceLevel}`)}</h2>{report.balanceLevel!=="building"&&<div className="mt-4 space-y-3">{report.memberShares.map(m=><div key={m.memberId}><div className="flex justify-between text-sm"><span>{m.firstName}</span><span>{m.percentage}%</span></div><div className="mt-1 h-2 rounded-full bg-white2 overflow-hidden"><div className="h-full rounded-full bg-mustard" style={{width:`${m.percentage}%`}}/></div></div>)}</div>}<p className="mt-4 text-xs text-muted">{t("weekly_report_balance_note")}</p></section>
  {members.length>=2&&me&&<section className="rounded-2xl border border-borderLight/70 bg-paper p-5">
   <p className="text-[11px] uppercase tracking-wide text-muted">{t("perception_gap_title")}</p>
   <h2 className="mt-1 font-serif text-xl text-ink">{t("perception_gap_question")}</h2>
   <div className="mt-4 grid gap-2 sm:grid-cols-2">
    {([
     ["balanced","perception_gap_balanced"],
     ["i_carry_more","perception_gap_i_carry_more"],
     ["other_carries_more","perception_gap_other_carries_more"],
     ["unclear","perception_gap_unclear"],
    ] as const).map(([value,label])=><button
     key={value}
     type="button"
     disabled={savingPerception}
     aria-pressed={loadPerception===value}
     onClick={()=>saveLoadPerception(value)}
     className={`rounded-xl border px-4 py-3 text-left text-sm transition disabled:opacity-50 ${loadPerception===value?"border-ink bg-ink text-paper":"border-borderLight bg-white2/70 text-ink"}`}
    >{t(label)}</button>)}
   </div>
   <p className="mt-3 text-xs text-muted">{t("perception_gap_private")}</p>
   {loadPerception&&perceptionGap!=="not_comparable"&&<p className="mt-4 rounded-xl bg-white2/70 p-4 text-sm text-ink">{t(perceptionGap==="aligned"?"perception_gap_aligned":perceptionGap==="perceives_more_concentrated"?"perception_gap_more_concentrated":perceptionGap==="perceives_more_balanced"?"perception_gap_more_balanced":"perception_gap_different")}</p>}
  </section>}
  <section className="rounded-2xl border border-borderLight/70 bg-white2/70 p-5"><p className="text-[11px] uppercase tracking-wide text-muted">{t("weekly_report_recognition")}</p><h2 className="mt-1 font-serif text-xl text-ink">{t(`weekly_report_recognition_${recognition}_title`)}</h2><p className="mt-2 text-sm text-ink">{t(`weekly_report_recognition_${recognition}_text`).replace("{count}",String(report.confirmedContributions))}</p><p className="mt-3 text-xs text-muted">{t("weekly_report_recognition_note")}</p></section>
  <section className="rounded-2xl border border-borderLight/70 bg-paper p-5"><p className="text-[11px] uppercase tracking-wide text-muted">{t("insights_title")}</p><h2 className="mt-1 font-serif text-xl text-ink">{t(insights.trend==="building"?"insights_building_title":`insights_trend_${insights.trend}_title`)}</h2><p className="mt-2 text-sm text-ink">{insights.trend==="building"?t("insights_building_text").replace("{count}",String(insights.currentCount)):t(`insights_trend_${insights.trend}_text`)}</p>{insights.enoughCurrentData&&<div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-white2/70 p-3"><p className="text-[11px] text-muted">{t("insights_completed_label")}</p><p className="mt-1 font-medium text-ink">{insights.currentCount}</p><p className="mt-1 text-[11px] text-muted">{insights.enoughComparisonData?t("insights_previous_value").replace("{value}",String(insights.previousCount)):t("insights_previous_unavailable")}</p></div><div className="rounded-xl bg-white2/70 p-3"><p className="text-[11px] text-muted">{t("insights_highest_share_label")}</p><p className="mt-1 font-medium text-ink">{insights.currentHighestShare===null?"—":`${insights.currentHighestShare}%`}</p><p className="mt-1 text-[11px] text-muted">{insights.enoughComparisonData&&insights.previousHighestShare!==null?t("insights_previous_value").replace("{value}",`${insights.previousHighestShare}%`):t("insights_previous_unavailable")}</p></div></div>}{!insights.enoughComparisonData&&insights.enoughCurrentData&&<p className="mt-4 text-xs text-muted">{t("insights_comparison_building")}</p>}<p className="mt-4 text-xs text-muted">{t("insights_footnote")}</p></section>
  {report.suggestion==="rebalance"&&<section className="rounded-2xl border border-borderLight/70 bg-paper p-5"><p className="text-[11px] uppercase tracking-wide text-muted">{t("weekly_report_suggestion")}</p><p className="mt-2 text-sm text-ink">{t("weekly_report_suggestion_rebalance")}</p>{rebalanceInProgress&&!applied&&<p className="mt-4 rounded-xl bg-white2/70 p-4 text-sm text-ink">{t(actionState==="awaiting_confirmation"?"weekly_report_action_awaiting_confirmation":"weekly_report_action_in_progress")}</p>}{actionState==="measured"&&!applied&&<p className="mt-4 rounded-xl bg-white2/70 p-4 text-sm text-ink">{t("weekly_report_action_measured")}</p>}{actionSuggestion&&!applied&&<div className="mt-4 rounded-xl bg-white2/70 p-4"><p className="font-medium text-ink">{actionSuggestion.taskName} · {actionSuggestion.taskPoints} pts</p><p className="mt-1 text-sm text-muted">{t("weekly_report_action_proposal").replace("{name}",actionSuggestion.suggestedMemberName)}</p>{!confirming?<button className="mt-3 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper" onClick={()=>setConfirming(true)}>{t("weekly_report_action_view")}</button>:<div className="mt-3"><p className="text-xs text-muted">{t("weekly_report_action_confirm").replace("{task}",actionSuggestion.taskName).replace("{name}",actionSuggestion.suggestedMemberName)}</p><div className="mt-3 flex gap-2"><button disabled={saving} className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-50" onClick={applySuggestion}>{saving?t("weekly_report_action_saving"):t("weekly_report_action_apply")}</button><button disabled={saving} className="rounded-full border border-borderLight px-4 py-2 text-sm text-ink" onClick={()=>setConfirming(false)}>{t("weekly_report_action_cancel")}</button></div></div>}</div>}{applied&&<p className="mt-4 rounded-xl bg-white2/70 p-4 text-sm text-ink">{t("weekly_report_action_done")}</p>}<p className="mt-3 text-xs text-muted">{t("weekly_report_suggestion_control")}</p></section>}
 </main></>;
}
function Metric({value,label}:{value:number;label:string}){return <div className="rounded-2xl border border-borderLight/70 bg-paper p-3 text-center"><p className="text-2xl font-semibold text-ink">{value}</p><p className="mt-1 text-[11px] text-muted">{label}</p></div>}
