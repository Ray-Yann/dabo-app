"use client";

import { useEffect, useMemo, useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { useHousehold } from "@/lib/use-household";
import { Header } from "@/components/Header";
import { BalanceBar } from "@/components/BalanceBar";
import { Task, ShoppingItem, CalendarEvent, Routine } from "@/lib/types";
import { ShoppingBag, Info, Plus, ListChecks, PartyPopper, Sparkles, Clock3, CalendarDays, Scale, UserRoundPlus, ChevronRight } from "lucide-react";
import { IntroTip } from "@/components/IntroTip";
import { InstallPrompt } from "@/components/InstallPrompt";
import { InviteNudge } from "@/components/InviteNudge";
import { TaskCompletionDialog } from "@/components/TaskCompletionDialog";
import { useT } from "@/lib/language-context";
import { useRouter } from "next/navigation";
import { nextOccurrence, daysUntil, todayCivilDate } from "@/lib/utils";
import { completeHouseholdTask } from "@/lib/task-completion";
import { ContributionBalanceData, countConfirmedContributionsSince, fetchContributionBalanceData } from "@/lib/task-contributions";
import { DaboInsight, generateDaboInsights } from "@/lib/dabo-engine";

export default function TodayPage() {
  const { loading, household, me, members, supabase } = useHousehold();
  const t = useT();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasksForBalance, setAllTasksForBalance] = useState<Task[]>([]);
  const [balanceData, setBalanceData] = useState<ContributionBalanceData>({ contributions: [], participants: [] });
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [totalItemsEver, setTotalItemsEver] = useState<number | null>(null);
  const [upcomingEvent, setUpcomingEvent] = useState<{ title: string; days: number } | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [showEquityInfo, setShowEquityInfo] = useState(false);
  const [completionTarget, setCompletionTarget] = useState<Task | null>(null);

  useEffect(() => {
    if (!household || !me) return;
    (async () => {
      const { data: myTasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("household_id", household.id)
        .eq("status", "pending")
        .or(`assigned_to.eq.${me.id},assigned_to.is.null`);
      setTasks((myTasks as Task[]) || []);

      const [{ data: allTasks }, contributionData] = await Promise.all([
        supabase.from("tasks").select("*").eq("household_id", household.id),
        fetchContributionBalanceData(supabase, household.id),
      ]);
      setAllTasksForBalance((allTasks as Task[]) || []);
      setBalanceData(contributionData);
      setShowEquityInfo(countConfirmedContributionsSince(contributionData.contributions, contributionData.participants, new Date(0)) < 2);

      const { data: myItems } = await supabase
        .from("shopping_items")
        .select("*")
        .eq("household_id", household.id)
        .eq("status", "to_buy")
        .or(`assigned_to.eq.${me.id},assigned_to.is.null`);
      setItems((myItems as ShoppingItem[]) || []);

      const { count } = await supabase
        .from("shopping_items")
        .select("*", { count: "exact", head: true })
        .eq("household_id", household.id);
      setTotalItemsEver(count ?? 0);

      const [{ data: events }, { data: routineData }] = await Promise.all([
        supabase.from("calendar_events").select("*").eq("household_id", household.id),
        supabase.from("routines").select("*").eq("household_id", household.id),
      ]);
      const householdEvents = (events as CalendarEvent[]) || [];
      setCalendarEvents(householdEvents);
      setRoutines((routineData as Routine[]) || []);

      const withNext = householdEvents
        .map((e) => ({ title: e.title, days: daysUntil(nextOccurrence(e.event_date, e.recurring)) }))
        .filter((e) => e.days >= 0 && e.days <= 7)
        .sort((a, b) => a.days - b.days);
      setUpcomingEvent(withNext[0] || null);
    })();
  }, [household, me]);

  async function toggleTask(task: Task, performerIds?: string[]) {
    if (!household || !me) return;

    if (!performerIds && task.assigned_to && task.assigned_to !== me.id) {
      setCompletionTarget(task);
      return;
    }

    setCompletionTarget(null);
    const result = await completeHouseholdTask(
      { supabase, householdId: household.id, members, me },
      task,
      performerIds || [me.id]
    );
    if (!result.ok) {
      if (result.reason === "contribution_error") alert(t("task_completion_error"));
      return;
    }

    const [{ data: myTasks }, { data: allTasks }, contributionData] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .eq("household_id", household.id)
        .eq("status", "pending")
        .or(`assigned_to.eq.${me.id},assigned_to.is.null`),
      supabase.from("tasks").select("*").eq("household_id", household.id),
      fetchContributionBalanceData(supabase, household.id),
    ]);

    setTasks((myTasks as Task[]) || []);
    setAllTasksForBalance((allTasks as Task[]) || []);
    setBalanceData(contributionData);
    setShowEquityInfo(countConfirmedContributionsSince(contributionData.contributions, contributionData.participants, new Date(0)) < 2);
  }
  async function toggleItem(id: string) {
    await supabase.from("shopping_items").update({ status: "bought", bought_at: new Date().toISOString() }).eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const daboInsights = useMemo(() => {
    if (!household) return [];
    const insights = generateDaboInsights({
      members,
      tasks: allTasksForBalance,
      calendarEvents,
      routines,
      today: todayCivilDate(),
    });

    const seenTypes = new Set<DaboInsight["type"]>();
    return insights
      .filter((insight) => {
        if (seenTypes.has(insight.type)) return false;
        seenTypes.add(insight.type);
        return true;
      })
      .slice(0, 3);
  }, [household, members, allTasksForBalance, calendarEvents, routines]);

  if (loading || !household || !me) return <LoadingState />;

  const nothingToDo = tasks.length === 0 && items.length === 0;
  const isBrandNew = nothingToDo && allTasksForBalance.length === 0 && totalItemsEver === 0;
  const sortedItems = [...items].sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));
  const sortedTasks = [...tasks].sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));

  const hasDaboEventInsight = daboInsights.some((insight) => insight.type === "upcoming_event");

  function insightDetails(insight: DaboInsight) {
    const task = insight.relatedEntityId
      ? allTasksForBalance.find((candidate) => candidate.id === insight.relatedEntityId)
      : undefined;
    const event = insight.relatedEntityId
      ? calendarEvents.find((candidate) => candidate.id === insight.relatedEntityId)
      : undefined;
    const suggestedMember = insight.suggestedMemberId
      ? members.find((member) => member.id === insight.suggestedMemberId)
      : undefined;

    if (insight.type === "overdue_task") {
      return {
        icon: Clock3,
        title: t(insight.titleKey),
        message: t(insight.messageKey).replace("{task}", task?.name || t("tasks_title")),
        reason: t(insight.reasonKey),
        href: "/app/taches",
      };
    }

    if (insight.type === "upcoming_event") {
      return {
        icon: CalendarDays,
        title: t(insight.titleKey),
        message: t(insight.messageKey).replace("{event}", event?.title || t("calendar_title")),
        reason: t(insight.reasonKey),
        href: "/app/calendrier",
      };
    }

    if (insight.type === "balance") {
      return {
        icon: Scale,
        title: t(insight.titleKey),
        message: t(insight.messageKey),
        reason: t(insight.reasonKey)
          .replace("{share}", String(insight.metadata?.highestShare ?? ""))
          .replace("{count}", String(insight.metadata?.completedTaskCount ?? "")),
        href: "/app/equilibre",
      };
    }

    return {
      icon: UserRoundPlus,
      title: t(insight.titleKey),
      message: t(insight.messageKey)
        .replace("{member}", suggestedMember?.first_name || t("unassigned"))
        .replace("{task}", task?.name || t("tasks_title")),
      reason: t(insight.reasonKey),
      href: "/app/taches",
    };
  }

  return (
    <div>
      <Header eyebrow={household.name} title={`${t("hello")}, ${me.first_name}`} />
      <IntroTip id="today" text={t("intro_today")} />
      <InstallPrompt />
      {household && (
        <InviteNudge
          householdId={household.id}
          memberCount={members.length}
          householdType={household.household_type}
          text={t("invite_nudge_text")}
        />
      )}

      {daboInsights.length > 0 && (
        <section className="mx-5 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={15} className="text-mustard" />
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">{t("dabo_insights_label")}</div>
          </div>
          <div className="space-y-2">
            {daboInsights.map((insight) => {
              const detail = insightDetails(insight);
              const InsightIcon = detail.icon;
              return (
                <button
                  key={insight.id}
                  type="button"
                  onClick={() => router.push(detail.href)}
                  className="w-full text-left bg-white2 rounded-2xl p-4 flex gap-3 items-start"
                >
                  <div className="w-9 h-9 rounded-xl bg-mustardBg flex items-center justify-center shrink-0">
                    <InsightIcon size={17} className="text-mustard" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-ink mb-1">{detail.title}</div>
                    <div className="text-sm text-ink leading-snug">{detail.message}</div>
                    <div className="text-[11px] mt-2 leading-snug">
                      <span className="font-semibold text-mustard mr-1.5">{t("dabo_why")}</span>
                      <span className="text-muted">{detail.reason}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-muted shrink-0 mt-1" />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {upcomingEvent && !hasDaboEventInsight && (
        <div className="mx-5 mb-4 flex items-center gap-2 bg-mustardBg rounded-xl p-3 text-sm text-ink">
          <PartyPopper size={16} className="text-mustard shrink-0" />
          <span className="flex-1">
            {upcomingEvent.title} —{" "}
            {upcomingEvent.days === 0 ? t("event_today") : upcomingEvent.days === 1 ? t("event_tomorrow") : `${t("event_in")} ${upcomingEvent.days} ${t("event_days")}`}
          </span>
        </div>
      )}

      {household.equity_score_enabled && (
        <div className="mx-5 mb-5 bg-white2 rounded-2xl p-4">
          <div className="text-xs text-muted mb-3 font-medium">{t("equity_week_label")}</div>
          <BalanceBar members={members} contributions={balanceData.contributions} participants={balanceData.participants} />
          {showEquityInfo && (
            <div className="mt-3 flex gap-2 text-[11px] text-muted bg-mustardBg rounded-lg p-2.5">
              <Info size={13} className="shrink-0 mt-0.5 text-mustard" />
              <span>{t("equity_intro")}</span>
            </div>
          )}
        </div>
      )}

      <div className="px-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">{t("today_todo")}</div>
        {nothingToDo && (
          isBrandNew ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted mb-4">{t("today_empty_new")}</p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => router.push("/app/courses")} className="flex items-center gap-1.5 bg-ink text-paper rounded-xl px-4 py-2.5 text-sm font-medium">
                  <Plus size={15} /> {t("courses_title")}
                </button>
                <button onClick={() => router.push("/app/taches")} className="flex items-center gap-1.5 bg-ink text-paper rounded-xl px-4 py-2.5 text-sm font-medium">
                  <Plus size={15} /> {t("tasks_title")}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted italic py-2">{t("today_empty")}</p>
          )
        )}

        {sortedItems.length > 0 && (
          <div className="mb-4">
            <div className="text-[11px] text-muted mb-1 flex items-center gap-1.5"><ShoppingBag size={11} /> {t("courses_title")} · {sortedItems.length}</div>
            <div className="space-y-1">
              {sortedItems.map((i) => (
                <div key={i.id} className="flex items-center gap-3 py-3 border-b border-borderLight cursor-pointer" onClick={() => toggleItem(i.id)}>
                  <div className="w-5 h-5 rounded-full border-2 border-border flex items-center justify-center text-muted shrink-0">
                    <ShoppingBag size={11} />
                  </div>
                  <span className="text-sm text-ink flex items-center gap-1.5 flex-1">
                    {i.urgent && <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" title={t("urgent_label")} />}
                    {i.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {sortedTasks.length > 0 && (
          <div>
            <div className="text-[11px] text-muted mb-1 flex items-center gap-1.5"><ListChecks size={11} /> {t("tasks_title")} · {sortedTasks.length}</div>
            <div className="space-y-1">
              {sortedTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 py-3 border-b border-borderLight cursor-pointer" onClick={() => toggleTask(task)}>
                  <div className="w-5 h-5 rounded-full border-2 border-border shrink-0" />
                  <span className="text-sm text-ink flex-1 flex items-center gap-1.5">
                    {task.urgent && <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" title={t("urgent_label")} />}
                    {task.name}
                  </span>
                  <span className="text-[11px] text-mustard bg-mustardBg rounded-full px-2 py-0.5 font-mono">{task.weight_points} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {completionTarget && (
        <TaskCompletionDialog
          task={completionTarget}
          me={me}
          members={members}
          t={t}
          onChoose={(performerIds) => void toggleTask(completionTarget, performerIds)}
          onCancel={() => setCompletionTarget(null)}
        />
      )}
    </div>
  );
}
