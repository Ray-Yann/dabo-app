"use client";

import { useEffect, useMemo, useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { useHousehold } from "@/lib/use-household";
import { Header } from "@/components/Header";
import { BalanceBar } from "@/components/BalanceBar";
import { Task, ShoppingItem, CalendarEvent, Routine } from "@/lib/types";
import { ShoppingBag, Info, Plus, Clock3, CalendarDays, Scale, UserRoundPlus, WalletCards, ListTodo } from "lucide-react";
import { IntroTip } from "@/components/IntroTip";
import { InstallPrompt } from "@/components/InstallPrompt";
import { InviteNudge } from "@/components/InviteNudge";
import { TaskCompletionDialog } from "@/components/TaskCompletionDialog";
import { useLanguage, useT } from "@/lib/language-context";
import { useRouter } from "next/navigation";
import { nextOccurrence, daysUntil, todayCivilDate } from "@/lib/utils";
import { completeHouseholdTask } from "@/lib/task-completion";
import { ContributionBalanceData, countConfirmedContributionsSince, fetchContributionBalanceData } from "@/lib/task-contributions";
import { DaboInsight, generateDaboInsights } from "@/lib/dabo-engine";
import { LobaHouseholdChat } from "@/components/LobaHouseholdChat";
import { trackAcquisitionEvent } from "@/lib/acquisition";
import { FinanceBillAttentionLike } from "@/lib/finance-engine";
import { AttentionCandidate, daboInsightAttentionCandidates, financeBillAttentionCandidates, selectHouseholdAttention, shoppingItemAttentionCandidates, taskAttentionCandidates } from "@/lib/attention-engine";
import { AttentionCard } from "@/components/dabo/AttentionCard";
import { EmptyState as DaboEmptyState } from "@/components/dabo/EmptyState";
import { SectionHeader } from "@/components/dabo/SectionHeader";

export default function TodayPage() {
  useEffect(() => { void trackAcquisitionEvent("app_open"); }, []);
  const { loading, household, me, members, supabase } = useHousehold();
  const t = useT();
  const lang = useLanguage();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasksForBalance, setAllTasksForBalance] = useState<Task[]>([]);
  const [balanceData, setBalanceData] = useState<ContributionBalanceData>({ contributions: [], participants: [] });
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [totalItemsEver, setTotalItemsEver] = useState<number | null>(null);
  const [activeHouseholdShoppingCount, setActiveHouseholdShoppingCount] = useState(0);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [financeBills, setFinanceBills] = useState<FinanceBillAttentionLike[]>([]);
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

      const [{ count }, { count: activeShoppingCount }] = await Promise.all([
        supabase
          .from("shopping_items")
          .select("*", { count: "exact", head: true })
          .eq("household_id", household.id),
        supabase
          .from("shopping_items")
          .select("*", { count: "exact", head: true })
          .eq("household_id", household.id)
          .eq("status", "to_buy"),
      ]);
      setTotalItemsEver(count ?? 0);
      setActiveHouseholdShoppingCount(activeShoppingCount ?? 0);

      const [{ data: events }, { data: routineData }, { data: billData }] = await Promise.all([
        supabase.from("calendar_events").select("*").eq("household_id", household.id).eq("visibility", "household"),
        supabase.from("routines").select("*").eq("household_id", household.id),
        supabase.from("finance_bills").select("id,label,amount,currency,due_on,status,paid_transaction_id").eq("household_id", household.id).eq("status", "pending").order("due_on", { ascending: true }),
      ]);
      const householdEvents = (events as CalendarEvent[]) || [];
      setCalendarEvents(householdEvents);
      setRoutines((routineData as Routine[]) || []);
      setFinanceBills((billData as FinanceBillAttentionLike[]) || []);

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
    const { error } = await supabase.rpc("dabo_set_shopping_item_status", { p_item_id: id, p_status: "bought" });
    if (!error) setItems((prev) => prev.filter((i) => i.id !== id));
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

  const attentionItems = useMemo(() => {
    if (!household || !me) return [];
    const today = todayCivilDate();
    const candidates = [
      ...taskAttentionCandidates(tasks, household.id, today),
      ...shoppingItemAttentionCandidates(items, household.id, today),
      ...financeBillAttentionCandidates(financeBills, household.id, today),
      ...daboInsightAttentionCandidates(daboInsights, household.id),
    ];
    return selectHouseholdAttention({
      candidates,
      householdId: household.id,
      viewerMemberId: me.id,
      now: `${today}T12:00:00.000Z`,
    });
  }, [household, me, tasks, items, financeBills, daboInsights]);

  if (loading || !household || !me) return <LoadingState />;

  const nothingToDo = tasks.length === 0 && items.length === 0;
  const isBrandNew = nothingToDo && allTasksForBalance.length === 0 && totalItemsEver === 0;
  const today = todayCivilDate();
  const upcomingHouseholdEventsCount = calendarEvents.filter((event) => {
    const days = daysUntil(nextOccurrence(event.event_date, event.recurring));
    return days >= 0 && days <= 7;
  }).length;

  const pendingBudgetTotal = financeBills.reduce((sum, bill) => sum + (bill.amount ?? 0), 0);
  const pendingBudgetCurrency = financeBills.find((bill) => bill.currency)?.currency || "EUR";
  const moneyLocaleByLang = {
    fr: "fr-BE",
    nl: "nl-BE",
    en: "en-GB",
    de: "de-DE",
    es: "es-ES",
    it: "it-IT",
    pt: "pt-PT",
  } as const;
  const pendingBudgetDisplay = new Intl.NumberFormat(moneyLocaleByLang[lang], {
    style: "currency",
    currency: pendingBudgetCurrency,
    minimumFractionDigits: Number.isInteger(pendingBudgetTotal) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(pendingBudgetTotal);

  const quickViewItems = [
    { key: "tasks", label: t("tasks_title"), value: tasks.length, icon: ListTodo, href: "/app/taches" },
    { key: "shopping", label: t("courses_title"), value: activeHouseholdShoppingCount, icon: ShoppingBag, href: "/app/courses" },
    { key: "calendar", label: t("calendar_title"), value: upcomingHouseholdEventsCount, icon: CalendarDays, href: "/app/calendrier" },
    { key: "budget", label: t("today_household_quick_budget"), value: pendingBudgetDisplay, icon: WalletCards, href: "/app/finances" },
  ];

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

  function attentionLevelLabel(level: AttentionCandidate["level"]) {
    if (level === "action_now") return t("attention_level_action_now");
    if (level === "anticipate") return t("attention_level_anticipate");
    if (level === "suggestion") return t("attention_level_suggestion");
    return t("attention_level_information");
  }

  function attentionDetails(attention: AttentionCandidate) {
    if (attention.id.startsWith("insight:")) {
      const insight = daboInsights.find((candidate) => `insight:${candidate.id}` === attention.id);
      if (insight) {
        const detail = insightDetails(insight);
        return {
          icon: detail.icon,
          title: detail.title,
          description: detail.message,
          meta: detail.reason,
          onAction: () => router.push(detail.href),
        };
      }
    }

    if (attention.source === "finance") {
      const days = Number(attention.metadata?.daysFromToday ?? 0);
      const due = days < 0
        ? t("today_finance_overdue")
        : days === 0
          ? t("today_finance_due_today")
          : t("today_finance_due_soon").replace("{days}", String(days));
      const amount = typeof attention.metadata?.amount === "number"
        ? new Intl.NumberFormat(undefined, { style: "currency", currency: String(attention.metadata?.currency || "EUR") }).format(Number(attention.metadata.amount))
        : null;
      return { icon: WalletCards, title: attention.title, description: due, meta: amount || undefined, onAction: () => router.push("/app/finances") };
    }

    if (attention.source === "shopping") {
      const item = attention.relatedEntityId ? items.find((candidate) => candidate.id === attention.relatedEntityId) : undefined;
      const description = attention.reason === "overdue"
        ? t("today_attention_shopping_overdue")
        : attention.reason === "urgent"
          ? t("today_attention_shopping_urgent")
          : t("today_attention_shopping_due_today");
      return { icon: ShoppingBag, title: attention.title, description, meta: t("courses_title"), onAction: item ? () => void toggleItem(item.id) : () => router.push("/app/courses") };
    }

    const task = attention.relatedEntityId ? tasks.find((candidate) => candidate.id === attention.relatedEntityId) : undefined;
    const description = attention.reason === "overdue"
      ? t("today_attention_task_overdue")
      : attention.reason === "urgent"
        ? t("today_attention_task_urgent")
        : t("today_attention_task_due_today");
    return { icon: Clock3, title: attention.title, description, meta: t("tasks_title"), onAction: task ? () => void toggleTask(task) : () => router.push("/app/taches") };
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

      <section className="px-5 pb-2">
        <SectionHeader title={t("today_essentials")} />

        {isBrandNew ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted mb-4">{t("today_empty_new")}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button onClick={() => router.push("/app/courses")} className="flex items-center gap-1.5 bg-ink text-paper rounded-xl px-4 py-2.5 text-sm font-medium">
                <Plus size={15} /> {t("courses_title")}
              </button>
              <button onClick={() => router.push("/app/taches")} className="flex items-center gap-1.5 bg-ink text-paper rounded-xl px-4 py-2.5 text-sm font-medium">
                <Plus size={15} /> {t("tasks_title")}
              </button>
              <button onClick={() => router.push("/app/calendrier")} className="flex items-center gap-1.5 border border-border bg-paper text-ink rounded-xl px-4 py-2.5 text-sm font-medium">
                <Plus size={15} /> {t("calendar_title")}
              </button>
            </div>
          </div>
        ) : attentionItems.length === 0 ? (
          <DaboEmptyState title={t("today_nothing_pressing_title")} message={t("today_nothing_pressing_text")} />
        ) : (
          <div className="space-y-2">
            {attentionItems.map((attention, index) => {
              const detail = attentionDetails(attention);
              return (
                <AttentionCard
                  key={attention.id}
                  level={attention.level}
                  levelLabel={attentionLevelLabel(attention.level)}
                  title={detail.title}
                  description={detail.description}
                  meta={detail.meta}
                  icon={detail.icon}
                  onAction={detail.onAction}
                  primary={index === 0}
                />
              );
            })}
          </div>
        )}

      </section>

      <section className="px-5 pb-5" data-testid="household-quick-view">
        <SectionHeader title={t("today_household_quick_view")} />
        <div className="grid grid-cols-2 gap-2">
          {quickViewItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => router.push(item.href)}
                className="dabo-home-orbit-card flex items-center gap-3 rounded-2xl bg-white2 px-3 py-3 text-left transition active:scale-[0.99]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-paper">
                  <Icon size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-lg font-semibold leading-none text-ink">{item.value}</span>
                  <span className="mt-1 block truncate text-xs text-muted">{item.label}</span>
                </span>
              </button>
            );
          })}
        </div>
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
