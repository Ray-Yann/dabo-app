"use client";

import { useEffect, useMemo, useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { useHousehold } from "@/lib/use-household";
import { Header } from "@/components/Header";
import { BalanceBar } from "@/components/BalanceBar";
import { Task, ShoppingItem, CalendarEvent, Routine } from "@/lib/types";
import { ShoppingBag, Info, Plus, ListChecks, Sparkles, Clock3, CalendarDays, Scale, UserRoundPlus, ChevronRight } from "lucide-react";
import { IntroTip } from "@/components/IntroTip";
import { InstallPrompt } from "@/components/InstallPrompt";
import { IconUpdateNotice } from "@/components/IconUpdateNotice";
import { InviteNudge } from "@/components/InviteNudge";
import { TaskCompletionDialog } from "@/components/TaskCompletionDialog";
import { useT } from "@/lib/language-context";
import { useRouter } from "next/navigation";
import { nextOccurrence, daysUntil, todayCivilDate } from "@/lib/utils";
import { completeHouseholdTask } from "@/lib/task-completion";
import { ContributionBalanceData, countConfirmedContributionsSince, fetchContributionBalanceData } from "@/lib/task-contributions";
import { DaboInsight, generateDaboInsights } from "@/lib/dabo-engine";
import { LobaHouseholdChat } from "@/components/LobaHouseholdChat";
import { trackAcquisitionEvent } from "@/lib/acquisition";

export default function TodayPage() {
  useEffect(() => { void trackAcquisitionEvent("app_open"); }, []);
  const { loading, household, me, members, supabase } = useHousehold();
  const t = useT();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasksForBalance, setAllTasksForBalance] = useState<Task[]>([]);
  const [balanceData, setBalanceData] = useState<ContributionBalanceData>({ contributions: [], participants: [] });
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [totalItemsEver, setTotalItemsEver] = useState<number | null>(null);
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
        .eq("status", "pending");
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
        supabase.from("calendar_events").select("*").eq("household_id", household.id).eq("visibility", "household"),
        supabase.from("routines").select("*").eq("household_id", household.id),
      ]);
      const householdEvents = (events as CalendarEvent[]) || [];
      setCalendarEvents(householdEvents);
      setRoutines((routineData as Routine[]) || []);

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
        .eq("status", "pending"),
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

    // Keep Phase 7.1.R3.1 behaviour: when several events are coming up,
    // Aujourd’hui must not silently hide the second one. Events within 7 days
    // can join the same maximum-three Suggestions DABO area.
    const engineEventIds = new Set(
      insights
        .filter((insight) => insight.type === "upcoming_event" && insight.relatedEntityId)
        .map((insight) => insight.relatedEntityId as string)
    );
    const weekEventInsights: DaboInsight[] = calendarEvents
      .map((event) => ({ event, days: daysUntil(nextOccurrence(event.event_date, event.recurring)) }))
      .filter(({ event, days }) => days >= 0 && days <= 7 && !engineEventIds.has(event.id))
      .map(({ event, days }) => ({
        id: `upcoming_event_week:${event.id}`,
        type: "upcoming_event" as const,
        priority: 40 + (7 - days),
        severity: "info" as const,
        titleKey: "dabo_insight_event_title",
        messageKey: "dabo_insight_event_message",
        reasonKey: "dabo_insight_event_week_reason",
        relatedEntityId: event.id,
        metadata: { daysAway: days },
      }));

    const seenTypes = new Set<DaboInsight["type"]>();
    return [...insights, ...weekEventInsights]
      .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
      .filter((insight) => {
        // Several upcoming events may all matter today. Other insight types
        // stay unique so the dashboard remains calm and varied.
        if (insight.type === "upcoming_event") return true;
        if (seenTypes.has(insight.type)) return false;
        seenTypes.add(insight.type);
        return true;
      })
      .slice(0, 3);
  }, [household, members, allTasksForBalance, calendarEvents, routines]);

  if (loading || !household || !me) return <LoadingState />;

  const nothingToDo = tasks.length === 0 && items.length === 0;
  const isBrandNew = nothingToDo && allTasksForBalance.length === 0 && totalItemsEver === 0;
  const today = todayCivilDate();

  // Aujourd’hui only surfaces what genuinely deserves attention now.
  // It never fills empty slots with future work.
  const representedTaskIds = new Set(
    daboInsights
      .filter((insight) => insight.relatedEntityId && (insight.type === "overdue_task" || insight.type === "assignment"))
      .map((insight) => insight.relatedEntityId as string)
  );

  const taskPriority = (task: Task) => {
    if (task.due_date && task.due_date < today) return 0;
    if (task.urgent) return 1;
    if (task.due_date === today) return 2;
    return 3;
  };

  const essentialTasks = [...tasks]
    .filter((task) =>
      !representedTaskIds.has(task.id) &&
      ((task.due_date !== null && task.due_date <= today) || task.urgent)
    )
    .sort((a, b) =>
      taskPriority(a) - taskPriority(b) ||
      (a.due_date || "9999-12-31").localeCompare(b.due_date || "9999-12-31") ||
      a.created_at.localeCompare(b.created_at)
    )
    .slice(0, 3);

  const itemPriority = (item: ShoppingItem) => {
    if (item.due_date && item.due_date < today) return 0;
    if (item.urgent) return 1;
    if (item.due_date === today) return 2;
    return 3;
  };

  const essentialItem = [...items]
    .filter((item) => (item.due_date !== null && item.due_date <= today) || item.urgent)
    .sort((a, b) =>
      itemPriority(a) - itemPriority(b) ||
      (a.due_date || "9999-12-31").localeCompare(b.due_date || "9999-12-31") ||
      a.created_at.localeCompare(b.created_at)
    )[0] || null;

  const hasEssentials = Boolean(essentialItem) || essentialTasks.length > 0;

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
      <IconUpdateNotice />
      {household && (
        <InviteNudge
          householdId={household.id}
          memberCount={members.length}
          householdType={household.household_type}
          text={t("invite_nudge_text")}
        />
      )}

      <section className="mx-5 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-mustardBg flex items-center justify-center">
              <Sparkles size={14} className="text-mustard" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-ink">{t("dabo_insights_label")}</div>
              <div className="text-[10px] text-muted">{t("loba_user_subtitle")}</div>
            </div>
          </div>
          {daboInsights.length === 0 ? (
            <div className="w-full bg-white2 rounded-2xl p-4 text-sm text-muted">{t("loba_user_calm")}</div>
          ) : (
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
          )}
        </section>

      <LobaHouseholdChat householdName={household.name} />

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

      <section className="px-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">{t("today_essentials")}</div>

        {isBrandNew ? (
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
        ) : !hasEssentials ? (
          <div className="bg-white2 rounded-2xl p-4 mb-3">
            <div className="text-sm font-semibold text-ink">{t("today_nothing_pressing_title")}</div>
            <div className="text-xs text-muted mt-1">{t("today_nothing_pressing_text")}</div>
          </div>
        ) : (
          <div className="bg-white2 rounded-2xl px-4 mb-3">
            {essentialItem && (
              <button
                type="button"
                className={`w-full flex items-center gap-3 py-3.5 text-left ${essentialTasks.length > 0 ? "border-b border-borderLight" : ""}`}
                onClick={() => void toggleItem(essentialItem.id)}
              >
                <div className="w-5 h-5 rounded-full border-2 border-border flex items-center justify-center text-muted shrink-0">
                  <ShoppingBag size={11} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-wide text-muted mb-0.5">{t("courses_title")}</div>
                  <div className="text-sm text-ink flex items-center gap-1.5">
                    {essentialItem.urgent && <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" title={t("urgent_label")} />}
                    <span className="truncate">{essentialItem.name}</span>
                  </div>
                </div>
              </button>
            )}

            {essentialTasks.map((task, index) => (
              <button
                key={task.id}
                type="button"
                className={`w-full flex items-center gap-3 py-3.5 text-left ${index < essentialTasks.length - 1 ? "border-b border-borderLight" : ""}`}
                onClick={() => void toggleTask(task)}
              >
                <div className="w-5 h-5 rounded-full border-2 border-border shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-wide text-muted mb-0.5">{t("tasks_title")}</div>
                  <div className="text-sm text-ink flex items-center gap-1.5">
                    {task.urgent && <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" title={t("urgent_label")} />}
                    <span className="truncate">{task.name}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {!isBrandNew && (
          <div className="flex items-center justify-between gap-3 pb-2">
            <button type="button" onClick={() => router.push("/app/courses")} className="text-xs text-muted hover:text-ink flex items-center gap-1">
              <ShoppingBag size={12} /> {t("today_view_courses")} <ChevronRight size={12} />
            </button>
            <button type="button" onClick={() => router.push("/app/taches")} className="text-xs text-muted hover:text-ink flex items-center gap-1">
              <ListChecks size={12} /> {t("today_view_tasks")} <ChevronRight size={12} />
            </button>
          </div>
        )}
      </section>

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
