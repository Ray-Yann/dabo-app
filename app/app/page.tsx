"use client";

import { useEffect, useMemo, useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { Avatar } from "@/components/Avatar";
import { useHousehold } from "@/lib/use-household";
import { Header } from "@/components/Header";
import { BalanceBar } from "@/components/BalanceBar";
import { Task, ShoppingItem, CalendarEvent, Routine } from "@/lib/types";
import { ShoppingBag, Info, Plus, Clock3, CalendarDays, Scale, UserRoundPlus, WalletCards, ListTodo, Bell, UsersRound, ChevronRight, X, Sparkles, ArrowRight } from "lucide-react";
import { IntroTip } from "@/components/IntroTip";
import { InstallPrompt } from "@/components/InstallPrompt";
import { InviteNudge } from "@/components/InviteNudge";
import { NotificationActivationNudge } from "@/components/NotificationActivationNudge";
import { TaskCompletionDialog } from "@/components/TaskCompletionDialog";
import { useLanguage, useT } from "@/lib/language-context";
import { useRouter } from "next/navigation";
import { daysUntil, todayCivilDate } from "@/lib/utils";
import {
  type CalendarEventCompletion,
  calendarCompletedOccurrenceSet,
  nextUncompletedOccurrence,
} from "@/lib/calendar-completions";
import { completeHouseholdTask } from "@/lib/task-completion";
import { ContributionBalanceData, computeContributionMemberPoints, countConfirmedContributionsSince, fetchContributionBalanceData } from "@/lib/task-contributions";
import { DaboInsight, generateDaboInsights } from "@/lib/dabo-engine";
import { LobaHouseholdChat } from "@/components/LobaHouseholdChat";
import { trackAcquisitionEvent } from "@/lib/acquisition";
import { notifyHousehold } from "@/lib/notifications";
import { FinanceBillAttentionLike } from "@/lib/finance-engine";
import { AttentionCandidate, daboInsightAttentionCandidates, financeBillAttentionCandidates, selectHouseholdAttention, shoppingHabitAttentionCandidates, shoppingItemAttentionCandidates, taskAttentionCandidates } from "@/lib/attention-engine";
import { AttentionCard } from "@/components/dabo/AttentionCard";
import { EmptyState as DaboEmptyState } from "@/components/dabo/EmptyState";
import { SectionHeader } from "@/components/dabo/SectionHeader";
import { computeHouseholdInsights } from "@/lib/household-insights";
import { buildTodayHouseholdIntelligenceCandidate } from "@/lib/today-household-intelligence";
import { applyHouseholdSignalLifecycle, householdAttentionFingerprint, householdSignalSnoozedUntil, type HouseholdAttentionReceipt } from "@/lib/household-attention-lifecycle";
import { recordContextualShareSuccess } from "@/lib/contextual-share";
import {
  buildHouseholdInboxHref,
  interpretHouseholdInbox,
  type HouseholdInboxDestination,
  type HouseholdInboxFinanceKind,
  type HouseholdInboxInterpretation,
} from "@/lib/household-inbox";
import { generateShoppingSuggestions, type ShoppingSuggestionPreference } from "@/lib/dabo-shopping-engine";

export default function TodayPage() {
  useEffect(() => {
    // Mobile Performance V1: analytics are best-effort and must not compete
    // with the critical Supabase reads needed for the first useful paint.
    const schedule = () => { void trackAcquisitionEvent("app_open"); };
    const win = window as Window & { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (win.requestIdleCallback) {
      const id = win.requestIdleCallback(schedule, { timeout: 2500 });
      return () => win.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(schedule, 1200);
    return () => window.clearTimeout(id);
  }, []);
  const { loading, household, me, members, supabase } = useHousehold();
  const t = useT();
  const lang = useLanguage();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasksForBalance, setAllTasksForBalance] = useState<Task[]>([]);
  const [balanceData, setBalanceData] = useState<ContributionBalanceData>({ contributions: [], participants: [] });
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [shoppingHistory, setShoppingHistory] = useState<ShoppingItem[]>([]);
  const [shoppingSuggestionPreferences, setShoppingSuggestionPreferences] = useState<ShoppingSuggestionPreference[]>([]);
  const [totalItemsEver, setTotalItemsEver] = useState<number | null>(null);
  const [activeHouseholdShoppingCount, setActiveHouseholdShoppingCount] = useState(0);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [completedCalendarOccurrences, setCompletedCalendarOccurrences] = useState<CalendarEventCompletion[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [financeBills, setFinanceBills] = useState<FinanceBillAttentionLike[]>([]);
  const [dashboardReady, setDashboardReady] = useState(false);
  const [dashboardLoadError, setDashboardLoadError] = useState(false);
  const [householdAttentionReceipt, setHouseholdAttentionReceipt] = useState<HouseholdAttentionReceipt | null>(null);
  const [showEquityInfo, setShowEquityInfo] = useState(false);
  const [completionTarget, setCompletionTarget] = useState<Task | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [showAllAttention, setShowAllAttention] = useState(false);
  const [householdInboxText, setHouseholdInboxText] = useState("");
  const [householdInboxProposal, setHouseholdInboxProposal] =
    useState<HouseholdInboxInterpretation | null>(null);

  useEffect(() => {
    if (!household || !me) return;
    let cancelled = false;
    setDashboardReady(false);
    setDashboardLoadError(false);
    (async () => {
      // Mobile Performance V1: the dashboard used to load its data in several
      // sequential waves and queried tasks twice. Fetch each independent
      // resource in one parallel wave and derive pending tasks locally.
      const [
        allTasksResult,
        contributionData,
        myItemsResult,
        shoppingHistoryResult,
        shoppingSuggestionPreferencesResult,
        totalShoppingResult,
        activeShoppingResult,
        eventsResult,
        routinesResult,
        billsResult,
        attentionReceiptResult,
      ] = await Promise.all([
        supabase.from("tasks").select("*").eq("household_id", household.id),
        fetchContributionBalanceData(supabase, household.id),
        supabase
          .from("shopping_items")
          .select("*")
          .eq("household_id", household.id)
          .eq("status", "to_buy")
          .or(`assigned_to.eq.${me.id},assigned_to.is.null`),
        supabase.from("shopping_items").select("*").eq("household_id", household.id),
        supabase.from("shopping_suggestion_preferences").select("*").eq("household_id", household.id),
        supabase.from("shopping_items").select("*", { count: "exact", head: true }).eq("household_id", household.id),
        supabase.from("shopping_items").select("*", { count: "exact", head: true }).eq("household_id", household.id).eq("status", "to_buy"),
        supabase.from("calendar_events").select("*").eq("household_id", household.id).eq("visibility", "household"),
        supabase.from("routines").select("*").eq("household_id", household.id),
        supabase.from("finance_bills").select("id,label,amount,currency,due_on,status,paid_transaction_id").eq("household_id", household.id).eq("status", "pending").order("due_on", { ascending: true }),
        me.user_id
          ? supabase.from("household_attention_receipts").select("signal_key,fingerprint,viewed_at,snoozed_until").eq("household_id", household.id).eq("user_id", me.user_id).eq("signal_key", "household-intelligence:weekly").maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      const loadedCalendarEvents = (eventsResult.data as CalendarEvent[]) || [];
      const completionResult = loadedCalendarEvents.length > 0
        ? await supabase
            .from("calendar_event_completions")
            .select("event_id, occurrence_date, completed_by, completed_at")
            .in("event_id", loadedCalendarEvents.map((event) => event.id))
        : { data: [], error: null };

      if (eventsResult.error) throw eventsResult.error;

      const allTasks = (allTasksResult.data as Task[]) || [];
      setTasks(allTasks.filter((task) => task.status === "pending"));
      setAllTasksForBalance(allTasks);
      setBalanceData(contributionData);
      setShowEquityInfo(countConfirmedContributionsSince(contributionData.contributions, contributionData.participants, new Date(0)) < 2);
      setItems((myItemsResult.data as ShoppingItem[]) || []);
      setShoppingHistory((shoppingHistoryResult.data as ShoppingItem[]) || []);
      setShoppingSuggestionPreferences(
        (shoppingSuggestionPreferencesResult.data as ShoppingSuggestionPreference[]) || []
      );
      setTotalItemsEver(totalShoppingResult.count ?? 0);
      setActiveHouseholdShoppingCount(activeShoppingResult.count ?? 0);
      setCalendarEvents(loadedCalendarEvents);
      setCompletedCalendarOccurrences(
        completionResult.error
          ? []
          : (completionResult.data as CalendarEventCompletion[]) || []
      );
      setRoutines((routinesResult.data as Routine[]) || []);
      setFinanceBills((billsResult.data as FinanceBillAttentionLike[]) || []);
      if (attentionReceiptResult.error) throw attentionReceiptResult.error;
      setHouseholdAttentionReceipt((attentionReceiptResult.data as HouseholdAttentionReceipt | null) || null);
      if (!cancelled) setDashboardReady(true);
    })().catch((error) => {
      console.error("DABO Today dashboard load failed", error);
      if (!cancelled) {
        setDashboardLoadError(true);
        setDashboardReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [household, me, supabase]);

  function prepareHouseholdInbox() {
    const value = householdInboxText.trim();

    if (!value) {
      setHouseholdInboxProposal(null);
      return;
    }

    setHouseholdInboxProposal(
      interpretHouseholdInbox(value, { referenceDate: todayCivilDate() })
    );
  }

  function setHouseholdInboxDestination(
    destination: Exclude<HouseholdInboxDestination, "unknown">
  ) {
    setHouseholdInboxProposal((current) => {
      if (!current) return current;

      return {
        ...current,
        destination,
        financeKind:
          destination === "finance" && current.destination === "finance"
            ? current.financeKind
            : null,
      };
    });
  }

  function setHouseholdInboxFinanceKind(
    financeKind: Exclude<HouseholdInboxFinanceKind, null>
  ) {
    setHouseholdInboxProposal((current) => {
      if (!current || current.destination !== "finance") return current;

      return {
        ...current,
        financeKind,
      };
    });
  }

  function confirmHouseholdInbox() {
    if (!householdInboxProposal) return;

    const href = buildHouseholdInboxHref(householdInboxProposal);
    if (!href) return;

    router.push(href);
  }

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

    if (me.user_id) recordContextualShareSuccess(me.user_id, household.id);

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
    const item = items.find((candidate) => candidate.id === id);
    const { error } = await supabase.rpc("dabo_set_shopping_item_status", { p_item_id: id, p_status: "bought" });
    if (!error) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (household && me && item) {
        void notifyHousehold(supabase, household.id, me.id, "notif_item_bought", { name: me.first_name, item: item.name });
      }
    }
  }

  const daboInsights = useMemo(() => {
    if (!household) return [];
    const assignmentSince = new Date();
    assignmentSince.setDate(assignmentSince.getDate() - 7);
    const contributionPointsByMember = computeContributionMemberPoints(
      members.map((member) => member.id),
      balanceData.contributions,
      balanceData.participants,
      assignmentSince
    );

    const insights = generateDaboInsights({
      members,
      tasks: allTasksForBalance,
      calendarEvents,
      completedCalendarOccurrences,
      routines,
      contributionPointsByMember,
      today: todayCivilDate(),
    });

    // Keep Phase 7.1.R3.1 behaviour: when several events are coming up,
    // Aujourdâ€™hui must not silently hide the second one. Events within 7 days
    // can join the same maximum-three Suggestions DABO area.
    const engineEventIds = new Set(
      insights
        .filter((insight) => insight.type === "upcoming_event" && insight.relatedEntityId)
        .map((insight) => insight.relatedEntityId as string)
    );
    const completedOccurrenceKeys = calendarCompletedOccurrenceSet(completedCalendarOccurrences);

    const weekEventInsights: DaboInsight[] = calendarEvents
      .map((event) => {
        const next = nextUncompletedOccurrence(event, completedOccurrenceKeys);
        return { event, days: next ? daysUntil(next) : Number.POSITIVE_INFINITY };
      })
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
  }, [household, members, allTasksForBalance, calendarEvents, completedCalendarOccurrences, routines]);

  const todayHouseholdIntelligence = useMemo(() => {
    if (!household || !dashboardReady || dashboardLoadError) return null;
    const insights = computeHouseholdInsights(members, balanceData.contributions, balanceData.participants);
    const candidate = buildTodayHouseholdIntelligenceCandidate({ householdId: household.id, insights });
    return applyHouseholdSignalLifecycle({
      candidate,
      receipt: householdAttentionReceipt,
      now: new Date().toISOString(),
    });
  }, [household, members, balanceData, dashboardReady, dashboardLoadError, householdAttentionReceipt]);

  const attentionItems = useMemo(() => {
    if (!household || !me) return [];
    const today = todayCivilDate();
    const insightCandidates = daboInsightAttentionCandidates(
      daboInsights,
      household.id
    );
    const shoppingHabitSuggestions = generateShoppingSuggestions({
      items: shoppingHistory,
      preferences: shoppingSuggestionPreferences,
      today,
    });
    const candidates = [
      ...taskAttentionCandidates(tasks, household.id, today),
      ...shoppingItemAttentionCandidates(items, household.id, today),
      ...shoppingHabitAttentionCandidates(shoppingHabitSuggestions, household.id),
      ...financeBillAttentionCandidates(financeBills, household.id, today),
      ...insightCandidates,
      ...(todayHouseholdIntelligence ? [todayHouseholdIntelligence] : []),
    ];
    return selectHouseholdAttention({
      candidates,
      householdId: household.id,
      viewerMemberId: me.id,
      now: `${today}T12:00:00.000Z`,
    });
  }, [household, me, tasks, items, shoppingHistory, shoppingSuggestionPreferences, financeBills, daboInsights, todayHouseholdIntelligence]);

  if (loading || !household || !me) return <LoadingState />;

  const nothingToDo = tasks.length === 0 && items.length === 0;
  const isBrandNew = nothingToDo && allTasksForBalance.length === 0 && totalItemsEver === 0;
  const today = todayCivilDate();
  const completedOccurrenceKeys = calendarCompletedOccurrenceSet(completedCalendarOccurrences);
  const upcomingHouseholdEventsCount = calendarEvents.filter((event) => {
    const next = nextUncompletedOccurrence(event, completedOccurrenceKeys);
    if (!next) return false;
    const days = daysUntil(next);
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

    if (insight.type === "upcoming_event") {
      return {
        icon: CalendarDays,
        title: t(insight.titleKey),
        message: t(insight.messageKey).replace("{event}", event?.title || t("calendar_title")),
        reason: t(insight.reasonKey),
        href: "/app/calendrier",
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

  async function consultHouseholdIntelligence(attention: AttentionCandidate) { 
    if (!household || !me?.user_id) {
      router.push("/app/bilan");
      return;
    }

    const viewedAt = new Date().toISOString();
    const receipt: HouseholdAttentionReceipt = {
      signal_key: attention.dedupeKey,
      fingerprint: householdAttentionFingerprint(attention),
      viewed_at: viewedAt,
      snoozed_until: householdSignalSnoozedUntil(viewedAt),
    };

    const { error } = await supabase.from("household_attention_receipts").upsert({
      household_id: household.id,
      user_id: me.user_id,
      ...receipt,
      updated_at: viewedAt,
    }, { onConflict: "household_id,user_id,signal_key" });

    if (error) {
      console.error("DABO household attention receipt save failed", error);
    } else {
      setHouseholdAttentionReceipt(receipt);
    }
    router.push("/app/bilan");
  }

  function attentionDetails(attention: AttentionCandidate) {
    if (attention.type === "household.weekly_watch") {
      return {
        icon: Scale,
        title: t("today_household_intelligence_title"),
        description: t("today_household_intelligence_text").replace("{count}", String(attention.metadata?.currentCount ?? "")),
        meta: t("today_household_intelligence_meta"),
        onAction: () => void consultHouseholdIntelligence(attention),
      };
    }

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
      if (attention.action === "open_shopping_suggestions") {
        return {
          icon: ShoppingBag,
          title: attention.title,
          description: t("today_attention_shopping_predictive"),
          meta: t("courses_title"),
          onAction: () => router.push("/app/courses?view=suggestions"),
        };
      }

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

  const locale = lang === "fr" ? "fr-BE" : lang === "nl" ? "nl-BE" : lang === "de" ? "de-DE" : lang === "es" ? "es-ES" : lang === "it" ? "it-IT" : lang === "pt" ? "pt-PT" : "en-GB";
  const todayLabel = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const visibleAttention = attentionItems.slice(0, 4);
  const displayedAttention = showAllAttention ? attentionItems : visibleAttention;
  // An attention already presented above should not appear a second time in today's tasks.
  const attentionTaskIds = new Set(displayedAttention.filter((item) => item.source === "tasks").map((item) => item.relatedEntityId).filter(Boolean));
  const todayTasks = tasks.filter((task) => task.status === "pending" && task.due_date === todayCivilDate() && !attentionTaskIds.has(task.id)).slice(0, Math.max(0, 4 - displayedAttention.length));

  const preparingInsight = daboInsights[0];

  return (
    <main className="dabo-today-v2">
      <header className="dabo-premium-topbar">
        <div className="dabo-premium-heading">
          <div className="dabo-premium-brand"><img src="/icon.svg" alt="DABO" width="52" height="52" /></div>
          <h1 className="dabo-today-v2-title">{t("hello")}, {me.first_name}</h1>
          <p className="dabo-today-v2-date">{todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)}</p>
        </div>
        <div className="dabo-premium-top-actions">
          <button type="button" className="dabo-premium-avatars" onClick={() => setMembersOpen(true)} aria-label={t("settings_members")}>
            {members.slice(0, 3).map((member) => (
              <span key={member.id} className="dabo-premium-avatar"><Avatar member={member} members={members} size={33} /></span>
            ))}
            {members.length > 3 && <span className="dabo-premium-avatar dabo-premium-avatar-extra">+{members.length - 3}</span>}
          </button>
          <button type="button" className="dabo-premium-bell" onClick={() => router.push("/app/reglages")} aria-label={t("settings_notifications")} title={t("settings_notifications")}><Bell size={21}/></button>
        </div>
      </header>

      <section className="dabo-v3-hero" aria-label={household.name}>
        <div className="dabo-v3-hero-photo" role="img" aria-label={household.name} />
        <div className="dabo-v3-hero-legend">{household.name}</div>
      </section>

      {membersOpen && <div className="dabo-premium-sheet-backdrop" onClick={() => setMembersOpen(false)}>
        <section className="dabo-premium-sheet" role="dialog" aria-modal="true" aria-label={t("settings_members")} onClick={(event) => event.stopPropagation()}>
          <div className="dabo-premium-sheet-title"><h2>{t("settings_members")}</h2><button type="button" onClick={() => setMembersOpen(false)} aria-label="×"><X size={22}/></button></div>
          <p className="dabo-premium-sheet-household">{household.name}</p>
          {members.map((member) => <div key={member.id} className="dabo-premium-member-row">
            <Avatar member={member} members={members} size={44} />
            <span>{member.first_name}{member.id === me.id ? ` · ${t("settings_profile_desc")}` : ""}</span>
          </div>)}
          <button type="button" className="dabo-premium-manage" onClick={() => router.push("/app/foyer")}><UsersRound size={20}/><span>{t("settings_members")}</span><ChevronRight size={18}/></button>
        </section>
      </div>}

      {dashboardLoadError ? (
        <section className="dabo-v3-panel" role="status">
          <h2>{t("today_v2_offline_title")}</h2>
          <p>{t("today_v2_offline_text")}</p>
          <button type="button" onClick={() => window.location.reload()}>{t("today_v2_retry")}</button>
        </section>
      ) : !dashboardReady ? <LoadingState /> : isBrandNew ? (
        <section className="dabo-v3-panel">
          <h2>{t("today_v2_welcome")}</h2>
          <p>{t("today_v2_welcome_text")}</p>
          <div className="dabo-v3-list">
            <button type="button" onClick={() => router.push("/app/foyer")}>{t("settings_members")}<ChevronRight size={18}/></button>
            <button type="button" onClick={() => router.push("/app/taches?first=1")}>{t("quick_action_task")}<ChevronRight size={18}/></button>
            <button type="button" onClick={() => router.push("/app/courses?first=1")}>{t("quick_action_shopping")}<ChevronRight size={18}/></button>
            <button type="button" onClick={() => router.push("/app/calendrier")}>{t("calendar_title")}<ChevronRight size={18}/></button>
          </div>
        </section>
      ) : <>
        <section className="dabo-v3-panel" aria-labelledby="dabo-v3-today-title">
          <div className="dabo-v3-section-heading">
            <h2 id="dabo-v3-today-title">{({fr:"Aujourd’hui",nl:"Vandaag",en:"Today",de:"Heute",es:"Hoy",it:"Oggi",pt:"Hoje"} as Record<string,string>)[lang] || "Today"}</h2>
            <button type="button" onClick={() => router.push("/app/taches")}>{t("tasks_title")} <ChevronRight size={17}/></button>
          </div>
          <div className="dabo-v3-list">
            {displayedAttention.map((attention) => {
              const detail = attentionDetails(attention);
              const urgent = attention.level === "action_now" || attention.reason === "overdue";
              return <button type="button" key={attention.id} onClick={detail.onAction} className="dabo-v3-line">
                <span className={`dabo-v3-status ${urgent ? "dabo-v3-status-urgent" : ""}`} aria-hidden="true" />
                <span className="dabo-v3-line-copy"><strong>{detail.title}</strong><small>{detail.description}</small></span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>;
            })}
            {todayTasks.map((task) => <button type="button" key={task.id} className="dabo-v3-line" onClick={() => void toggleTask(task)}>
              <span className="dabo-v3-status" aria-hidden="true" />
              <span className="dabo-v3-line-copy"><strong>{task.name}</strong><small>{t("today_attention_task_due_today")}</small></span>
              {task.assigned_to && members.find((member) => member.id === task.assigned_to) && <Avatar member={members.find((member) => member.id === task.assigned_to) || null} members={members} size={30} />}
              <ChevronRight size={18} aria-hidden="true" />
            </button>)}
            {visibleAttention.length === 0 && todayTasks.length === 0 && <div className="dabo-v3-empty"><strong>{t("today_v2_calm_title")}</strong><p>{t("today_v2_calm_text")}</p></div>}
            {attentionItems.length > visibleAttention.length && <button type="button" className="dabo-v3-expand" aria-expanded={showAllAttention} onClick={() => setShowAllAttention((previous) => !previous)}>{showAllAttention ? t("today_v3_less_attention") : t("today_v3_more_attention")}</button>}
          </div>
        </section>
        {preparingInsight && <section className="dabo-v3-panel" aria-labelledby="dabo-v3-next-title">
          <div className="dabo-v3-section-heading"><h2 id="dabo-v3-next-title">{t("today_v2_preparing")}</h2></div>
          <div className="dabo-v3-line dabo-v3-insight"><span className="dabo-v3-status" aria-hidden="true"/><span className="dabo-v3-line-copy"><strong>{t(preparingInsight.titleKey)}</strong><small>{t(preparingInsight.messageKey)}</small></span></div>
        </section>}
        <section className="dabo-v3-balance" aria-label={t("balance_title")}>
          <span className="dabo-v3-balance-leaf" aria-hidden="true">✦</span>
          <div><strong>{t("today_household_intelligence_title")}</strong><small>{t("today_household_intelligence_meta")}</small></div>
          <button type="button" onClick={() => router.push("/app/bilan")}>{t("today_v2_discover")} <ChevronRight size={16}/></button>
        </section>
        {activeHouseholdShoppingCount > 0 && <section className="dabo-v3-panel" aria-labelledby="dabo-v3-shopping-title">
          <div className="dabo-v3-section-heading"><h2 id="dabo-v3-shopping-title">{t("courses_title")}</h2><button type="button" onClick={() => router.push("/app/courses")}>{activeHouseholdShoppingCount} <ChevronRight size={17}/></button></div>
          <button type="button" className="dabo-v3-line" onClick={() => router.push("/app/courses")}><span className="dabo-v3-status" aria-hidden="true"/><span className="dabo-v3-line-copy"><strong>{t("courses_title")}</strong><small>{activeHouseholdShoppingCount}</small></span><ChevronRight size={18}/></button>
        </section>}
      </>}

      {completionTarget && <TaskCompletionDialog task={completionTarget} me={me} members={members} t={t} onChoose={(performerIds) => void toggleTask(completionTarget, performerIds)} onCancel={() => setCompletionTarget(null)} />}
    </main>
  );
}
