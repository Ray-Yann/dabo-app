"use client";

import { useEffect, useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { useHousehold } from "@/lib/use-household";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { IntroTip } from "@/components/IntroTip";
import { CalendarEvent, Task } from "@/lib/types";
import { daysUntil, todayCivilDate } from "@/lib/utils";
import { occurrencesInRange, isRecurringCalendarEvent, CalendarRecurrenceFrequency } from "@/lib/calendar-recurrence";
import {
  CalendarEventCompletion,
  calendarCompletedOccurrenceSet,
  calendarOccurrenceDate,
  isCalendarOccurrenceCompleted,
  nextUncompletedOccurrence,
} from "@/lib/calendar-completions";
import { useT } from "@/lib/language-context";
import { trackAcquisitionEvent } from "@/lib/acquisition";
import { addMinutesToTime, durationMinutes, taskVisibleInPlanningScope, type PlanningTaskSlot } from "@/lib/planning-v2";
import { completeFirstValueGuidance } from "@/lib/first-value-guidance";
import { readCalendarInboxPrefill } from "@/lib/household-inbox";
import { Trash2, Repeat, PartyPopper, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Pencil, LockKeyhole, Users, ListChecks, ReceiptText, Clock3, UserRoundCheck, Sparkles } from "lucide-react";

type CalendarView = "upcoming" | "month" | "personal";
type PlanningMode = "day" | "week" | "month";
type PlanningScope = "all" | "me" | "household";
type PlanningResponsibility = { id:string; event_id:string; label:string; responsibility_kind:"preparation"|"transport"|"decision"; assigned_to:string|null; due_date:string|null; due_time:string|null; status:"pending"|"done" };
type PlanningBill = { id: string; label: string; due_on: string; status: "pending" | "paid" | "cancelled"; amount: number | null; currency: string };

export default function CalendarPage() {
  const { loading, household, me, members, supabase } = useHousehold();
  const t = useT();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [completedOccurrences, setCompletedOccurrences] = useState<CalendarEventCompletion[]>([]);
  const [view, setView] = useState<CalendarView>("upcoming");
  const [planningMode, setPlanningMode] = useState<PlanningMode>("week");
  const [planningScope, setPlanningScope] = useState<PlanningScope>("all");
  const [planningTasks, setPlanningTasks] = useState<Task[]>([]);
  const [planningBills, setPlanningBills] = useState<PlanningBill[]>([]);
  const [planningSlots, setPlanningSlots] = useState<PlanningTaskSlot[]>([]);
  const [planningResponsibilities, setPlanningResponsibilities] = useState<PlanningResponsibility[]>([]);
  const [planningDate, setPlanningDate] = useState(() => todayCivilDate());
  const [slotTaskId, setSlotTaskId] = useState<string | null>(null);
  const [slotTime, setSlotTime] = useState("18:00");
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [selectedMonthDay, setSelectedMonthDay] = useState<number | null>(null);
  const [newVisibility, setNewVisibility] = useState<"household" | "personal">("household");
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventKind, setEventKind] = useState<"event" | "reminder">("event");
  const [eventTime, setEventTime] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [responsibilityLabel, setResponsibilityLabel] = useState("");
  const [responsibilityAssignee, setResponsibilityAssignee] = useState("");
  const [responsibilityEventId, setResponsibilityEventId] = useState<string | null>(null);
  const [responsibilityDraft, setResponsibilityDraft] = useState("");
  const [responsibilityDraftAssignee, setResponsibilityDraftAssignee] = useState("");
  const [responsibilityDraftDate, setResponsibilityDraftDate] = useState("");
  const [responsibilityDraftTime, setResponsibilityDraftTime] = useState("");
  const [responsibilityDetailsOpen, setResponsibilityDetailsOpen] = useState(false);
  const [responsibilityFeedback, setResponsibilityFeedback] = useState<PlanningResponsibility | null>(null);
  const [notes, setNotes] = useState("");
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<CalendarRecurrenceFrequency>("none");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [reminderDays, setReminderDays] = useState(0);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editEventKind, setEditEventKind] = useState<"event" | "reminder">("event");
  const [editEventTime, setEditEventTime] = useState("");
  const [editEventEndTime, setEditEventEndTime] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editRecurrenceFrequency, setEditRecurrenceFrequency] = useState<CalendarRecurrenceFrequency>("none");
  const [editRecurrenceInterval, setEditRecurrenceInterval] = useState(1);
  const [editRecurrenceEndDate, setEditRecurrenceEndDate] = useState("");
  const [editReminderDays, setEditReminderDays] = useState(0);
  const [showEditMoreOptions, setShowEditMoreOptions] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [firstValueConfirmation, setFirstValueConfirmation] = useState(false);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("first") !== "1") return;

    const inboxPrefill = readCalendarInboxPrefill(url.searchParams);

    url.searchParams.delete("first");

    if (inboxPrefill) {
      url.searchParams.delete("inbox");
      url.searchParams.delete("title");
      url.searchParams.delete("date");
      url.searchParams.delete("time");
    }

    window.history.replaceState(
      window.history.state,
      "",
      url.pathname + url.search + url.hash
    );

    setView("upcoming");
    setNewVisibility("household");
    setEditingId(null);

    if (inboxPrefill) {
      setTitle(inboxPrefill.title);
      setEventDate(inboxPrefill.eventDate || todayCivilDate());
      setEventTime(inboxPrefill.eventTime);
      setShowMoreOptions(Boolean(inboxPrefill.eventTime));
    }

    setShowAdd(true);
  }, []);


  async function loadEvents() {
    if (!household) return;
    const [{ data, error }, taskResult, billResult, slotResult, responsibilityResult] = await Promise.all([
      supabase.from("calendar_events").select("*").eq("household_id", household.id),
      supabase.from("tasks").select("id,household_id,routine_id,name,weight_points,duration_key,effort_level,assigned_to,status,urgent,due_date,completed_at,created_at").eq("household_id", household.id).eq("status", "pending"),
      supabase.from("finance_bills").select("id,label,due_on,status,amount,currency").eq("household_id", household.id).eq("status", "pending"),
      supabase.from("planning_task_slots").select("id,household_id,task_id,occurrence_date,start_time,end_time,created_by").eq("household_id", household.id),
      supabase.from("calendar_event_responsibilities").select("id,event_id,label,responsibility_kind,assigned_to,due_date,due_time,status").eq("household_id", household.id),
    ]);
    setPlanningTasks((taskResult.data as Task[]) || []);
    setPlanningBills((billResult.data as PlanningBill[]) || []);
    setPlanningSlots((slotResult.data as PlanningTaskSlot[]) || []);
    setPlanningResponsibilities((responsibilityResult.data as PlanningResponsibility[]) || []);
    if (error) {
      setErrorMessage(t("calendar_error_load"));
      return;
    }
    const loadedEvents = (data as CalendarEvent[]) || [];
    setEvents(loadedEvents);

    if (loadedEvents.length === 0) {
      setCompletedOccurrences([]);
      setErrorMessage("");
      return;
    }

    const { data: completionData, error: completionError } = await supabase
      .from("calendar_event_completions")
      .select("event_id, occurrence_date, completed_by, completed_at")
      .in("event_id", loadedEvents.map((event) => event.id));

    if (completionError) {
      setErrorMessage(t("calendar_error_load"));
      return;
    }

    setCompletedOccurrences(
      (completionData as CalendarEventCompletion[]) || []
    );
    setErrorMessage("");
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (household) loadEvents();
  }, [household]);

  async function addEvent() {
    if (!title.trim() || !eventDate || !household || !me) return;
    const { data: createdEvent, error } = await supabase.from("calendar_events").insert({
      household_id: household.id,
      created_by: me.id,
      title: title.trim(),
      event_date: eventDate,
      recurring: recurrenceFrequency !== "none",
      recurrence_frequency: recurrenceFrequency,
      recurrence_interval: recurrenceInterval,
      recurrence_end_date: recurrenceEndDate || null,
      event_time: eventTime || null,
      end_time: eventEndTime || null,
      time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      all_day: !eventTime,
      notes: notes.trim() || null,
      event_kind: eventKind,
      reminder_days_before: reminderDays,
      visibility: newVisibility,
      private_owner_id: newVisibility === "personal" ? me.id : null,
    }).select("id").single();
    if (error) {
      setErrorMessage(t("calendar_error_save"));
      return;
    }
    if (createdEvent?.id && responsibilityLabel.trim() && newVisibility === "household") {
      await supabase.from("calendar_event_responsibilities").insert({
        household_id: household.id, event_id: createdEvent.id, label: responsibilityLabel.trim(),
        responsibility_kind: "preparation", assigned_to: responsibilityAssignee || null,
        due_date: eventDate, due_time: eventTime || null, created_by: me.id,
      });
    }
    void trackAcquisitionEvent("first_value", { householdId: household.id, valueType: "calendar" });
    if (completeFirstValueGuidance("calendar")) {
      setFirstValueConfirmation(true);
      window.setTimeout(() => setFirstValueConfirmation(false), 3200);
    }
    setErrorMessage("");
    setTitle("");
    setEventDate("");
    setEventKind("event");
    setEventTime("");
    setEventEndTime("");
    setResponsibilityLabel("");
    setResponsibilityAssignee("");
    setNotes("");
    setRecurrenceFrequency("none");
    setRecurrenceInterval(1);
    setRecurrenceEndDate("");
    setReminderDays(0);
    setShowMoreOptions(false);
    setShowAdd(false);
    if (newVisibility === "personal") setView("personal");
    else if (view === "personal") setView("upcoming");
    loadEvents();
  }

  async function completeOccurrence(eventId: string, occurrenceDate: string) {
    if (!me) return;

    const { error } = await supabase
      .from("calendar_event_completions")
      .insert({
        event_id: eventId,
        occurrence_date: occurrenceDate,
        completed_by: me.id,
      });

    if (error) {
      setErrorMessage(t("calendar_error_save"));
      return;
    }

    setErrorMessage("");
    await loadEvents();
  }

  async function restoreOccurrence(eventId: string, occurrenceDate: string) {
    const { error } = await supabase
      .from("calendar_event_completions")
      .delete()
      .eq("event_id", eventId)
      .eq("occurrence_date", occurrenceDate);

    if (error) {
      setErrorMessage(t("calendar_error_save"));
      return;
    }

    setErrorMessage("");
    await loadEvents();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("calendar_events").delete().eq("id", id);
    if (error) {
      setErrorMessage(t("calendar_error_delete"));
      return;
    }
    setErrorMessage("");
    setDeleteTarget(null);
    loadEvents();
  }

  function startEditing(event: CalendarEvent) {
    setErrorMessage("");
    setEditingId(event.id);
    setEditTitle(event.title);
    setEditDate(event.event_date);
    setEditEventKind(event.event_kind || "event");
    setEditEventTime(event.event_time?.slice(0, 5) || "");
    setEditEventEndTime(event.end_time?.slice(0, 5) || "");
    setEditNotes(event.notes || "");
    setEditRecurrenceFrequency(event.recurrence_frequency || (event.recurring ? "yearly" : "none"));
    setEditRecurrenceInterval(event.recurrence_interval || 1);
    setEditRecurrenceEndDate(event.recurrence_end_date || "");
    setEditReminderDays(event.reminder_days_before ?? 0);
    setShowEditMoreOptions(false);
    setShowAdd(false);
    setShowMoreOptions(false);
  }

  function cancelEditing() {
    setEditingId(null);
    setShowEditMoreOptions(false);
  }

  function changeView(nextView: CalendarView) {
    setView(nextView);
    setNewVisibility(nextView === "personal" ? "personal" : "household");
    setShowAdd(false);
    setShowMoreOptions(false);
    cancelEditing();
    setErrorMessage("");
  }

  async function saveEvent() {
    if (!editingId || !editTitle.trim() || !editDate) return;
    const { error } = await supabase
      .from("calendar_events")
      .update({
        title: editTitle.trim(),
        event_date: editDate,
        recurring: editRecurrenceFrequency !== "none",
        recurrence_frequency: editRecurrenceFrequency,
        recurrence_interval: editRecurrenceInterval,
        recurrence_end_date: editRecurrenceEndDate || null,
        event_time: editEventTime || null,
        end_time: editEventEndTime || null,
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        all_day: !editEventTime,
        notes: editNotes.trim() || null,
        event_kind: editEventKind,
        reminder_days_before: editReminderDays,
      })
      .eq("id", editingId);
    if (error) {
      setErrorMessage(t("calendar_error_save"));
      return;
    }
    setErrorMessage("");
    cancelEditing();
    loadEvents();
  }

  if (loading || !household) return <LoadingState />;

  const locale = ({ fr: "fr-BE", nl: "nl-BE", en: "en-GB", de: "de-BE", es: "es-ES", it: "it-IT", pt: "pt-PT" } as const)[me?.language || "fr"] || "fr-BE";

  function formatEventDate(date: Date) {
    const currentYear = new Date().getFullYear();
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      ...(date.getFullYear() !== currentYear ? { year: "numeric" as const } : {}),
    }).format(date);
  }

  function proximityLabel(date: Date) {
    const days = daysUntil(date);
    if (days === 0) return t("event_today");
    if (days === 1) return t("event_tomorrow");
    return `${t("event_in")} ${days} ${t("event_days")}`;
  }

  function recurrenceLabel(event: CalendarEvent) {
    const frequency = event.recurrence_frequency || (event.recurring ? "yearly" : "none");
    const interval = event.recurrence_interval || 1;
    if (frequency === "daily") return interval === 1 ? t("calendar_every_day") : `${t("calendar_every")} ${interval} ${t("calendar_days_unit")}`;
    if (frequency === "weekly") return interval === 1 ? t("calendar_every_week") : `${t("calendar_every")} ${interval} ${t("calendar_weeks_unit")}`;
    if (frequency === "monthly") return interval === 1 ? t("calendar_every_month") : `${t("calendar_every")} ${interval} ${t("calendar_months_unit")}`;
    if (frequency === "yearly") return interval === 1 ? t("event_every_year") : `${t("calendar_every")} ${interval} ${t("calendar_years_unit")}`;
    return t("calendar_never");
  }

  const visibleEvents = events.filter((event) => {
    if (planningScope === "household") return event.visibility === "household";
    if (planningScope === "me") return event.visibility === "personal" && event.private_owner_id === me?.id;
    return event.visibility === "household" || (event.visibility === "personal" && event.private_owner_id === me?.id);
  });

  const completedOccurrenceKeys = calendarCompletedOccurrenceSet(completedOccurrences);

  const upcoming = visibleEvents
    .map((e) => ({
      ...e,
      next: nextUncompletedOccurrence(e, completedOccurrenceKeys),
    }))
    .filter((e): e is typeof e & { next: Date } => Boolean(e.next))
    .filter((e) => planningMode === "day" ? daysUntil(e.next) === 0 : planningMode === "week" ? daysUntil(e.next) >= 0 && daysUntil(e.next) <= 6 : true)
    .sort((a, b) => a.next.getTime() - b.next.getTime());

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(todayStart);
  const daysToSunday = (7 - endOfWeek.getDay()) % 7;
  endOfWeek.setDate(endOfWeek.getDate() + daysToSunday);
  endOfWeek.setHours(23, 59, 59, 999);

  const todayEvents = upcoming.filter((event) => daysUntil(event.next) === 0);
  const weekEvents = upcoming.filter((event) => daysUntil(event.next) > 0 && event.next <= endOfWeek);
  const laterEvents = upcoming.filter((event) => event.next > endOfWeek);

  const sections = [
    { key: "today", label: t("calendar_section_today"), events: todayEvents },
    { key: "week", label: t("calendar_section_week"), events: weekEvents },
    { key: "later", label: t("calendar_section_later"), events: laterEvents },
  ].filter((section) => section.events.length > 0);

  const planningTaskItems = planningTasks
    .filter((task) => Boolean(task.due_date))
    .filter((task) => taskVisibleInPlanningScope(task, planningScope, me?.id))
    .filter((task) => {
      const date = new Date(`${task.due_date}T12:00:00`);
      const delta = daysUntil(date);
      return planningMode === "day" ? delta === 0 : planningMode === "week" ? delta >= 0 && delta <= 6 : true;
    })
    .sort((a,b) => String(a.due_date).localeCompare(String(b.due_date)));
  const planningBillItems = planningBills
    .filter((bill) => planningScope !== "me")
    .filter((bill) => {
      const date = new Date(`${bill.due_on}T12:00:00`);
      const delta = daysUntil(date);
      return planningMode === "day" ? delta === 0 : planningMode === "week" ? delta >= 0 && delta <= 6 : true;
    })
    .sort((a,b) => a.due_on.localeCompare(b.due_on));

  const selectedPlanningDate = new Date(`${planningDate}T12:00:00`);
  const dayStart = new Date(`${planningDate}T00:00:00`);
  const dayEnd = new Date(`${planningDate}T23:59:59`);
  const dayEvents = visibleEvents.flatMap((event) => occurrencesInRange(event, dayStart, dayEnd).map((occurrence) => ({ ...event, occurrence, occurrenceDate: calendarOccurrenceDate(occurrence) })))
    .filter((event) => !isCalendarOccurrenceCompleted(completedOccurrenceKeys, event.id, event.occurrenceDate))
    .sort((a,b) => (a.event_time || "99:99").localeCompare(b.event_time || "99:99"));
  const daySlots = planningSlots.filter((slot) => slot.occurrence_date === planningDate).sort((a,b) => a.start_time.localeCompare(b.start_time));
  const dayTaskIds = new Set(daySlots.map((slot) => slot.task_id));
  const dayUnscheduledTasks = planningTasks.filter((task) => task.due_date === planningDate && !dayTaskIds.has(task.id) && taskVisibleInPlanningScope(task, planningScope, me?.id));
  const dayBills = planningBills.filter((bill) => bill.due_on === planningDate && planningScope !== "me");

  const dayUnassignedResponsibilities = dayEvents.flatMap((event) => planningResponsibilities.filter((r)=>r.event_id===event.id && r.status==="pending" && !r.assigned_to));
  const dayOrganizeCount = dayUnscheduledTasks.length + dayBills.length + dayUnassignedResponsibilities.length;
  const weekDays = Array.from({length:7},(_,index)=>{ const date=new Date(); date.setHours(12,0,0,0); date.setDate(date.getDate()+index); return date; });
  const weekDayData = weekDays.map((date)=>{
    const civil=calendarOccurrenceDate(date); const start=new Date(`${civil}T00:00:00`); const end=new Date(`${civil}T23:59:59`);
    const eventsForDay=visibleEvents.flatMap((event)=>occurrencesInRange(event,start,end).map((occurrence)=>({...event,occurrence,occurrenceDate:calendarOccurrenceDate(occurrence)}))).filter((event)=>!isCalendarOccurrenceCompleted(completedOccurrenceKeys,event.id,event.occurrenceDate));
    const tasksForDay=planningTasks.filter((task)=>task.due_date===civil && taskVisibleInPlanningScope(task,planningScope,me?.id));
    const billsForDay=planningBills.filter((bill)=>bill.due_on===civil && planningScope!=="me");
    return {date,civil,events:eventsForDay,tasks:tasksForDay,bills:billsForDay};
  });

  function movePlanningDay(delta:number) {
    const next = new Date(`${planningDate}T12:00:00`); next.setDate(next.getDate()+delta);
    setPlanningDate(`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,"0")}-${String(next.getDate()).padStart(2,"0")}`);
  }

  async function addResponsibility(eventId:string) {
    if (!household || !me || !responsibilityDraft.trim()) return;
    const { error } = await supabase.from("calendar_event_responsibilities").insert({ household_id:household.id, event_id:eventId, label:responsibilityDraft.trim(), responsibility_kind:"preparation", assigned_to:responsibilityDraftAssignee || null, due_date:responsibilityDraftDate || planningDate, due_time:responsibilityDraftTime || null, created_by:me.id });
    if (error) { setErrorMessage(t("calendar_error_save")); return; }
    setResponsibilityDraft(""); setResponsibilityDraftAssignee(""); setResponsibilityDraftDate(""); setResponsibilityDraftTime(""); setResponsibilityDetailsOpen(false); setResponsibilityEventId(null); await loadEvents();
  }

  async function completeResponsibility(id:string) {
    const completed = planningResponsibilities.find((item)=>item.id===id) || null;
    const { error } = await supabase.from("calendar_event_responsibilities").update({ status:"done" }).eq("id",id);
    if (error) { setErrorMessage(t("calendar_error_save")); return; }
    setResponsibilityFeedback(completed); await loadEvents();
  }

  async function restoreResponsibility(id:string) {
    const { error } = await supabase.from("calendar_event_responsibilities").update({ status:"pending" }).eq("id",id);
    if (error) { setErrorMessage(t("calendar_error_save")); return; }
    setResponsibilityFeedback(null); await loadEvents();
  }

  async function saveTaskSlot(task: Task) {
    if (!household || !me || !slotTime) return;
    const end = addMinutesToTime(slotTime, durationMinutes(task.duration_key));
    const { error } = await supabase.from("planning_task_slots").upsert({ household_id:household.id, task_id:task.id, occurrence_date:planningDate, start_time:slotTime, end_time:end, created_by:me.id }, { onConflict:"task_id,occurrence_date" });
    if (error) { setErrorMessage(t("calendar_error_save")); return; }
    setSlotTaskId(null); await loadEvents();
  }

  const monthDate = monthCursor;
  const monthYear = monthDate.getFullYear();
  const monthIndex = monthDate.getMonth();
  const firstWeekday = (new Date(monthYear, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(monthYear, monthIndex + 1, 0).getDate();
  const monthCells = Array.from({ length: firstWeekday + daysInMonth }, (_, index) => index < firstWeekday ? null : index - firstWeekday + 1);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(monthDate);
  const monthStart = new Date(monthYear, monthIndex, 1);
  const monthEnd = new Date(monthYear, monthIndex + 1, 0);
  const monthEvents = visibleEvents.flatMap((event) =>
    occurrencesInRange(event, monthStart, monthEnd).map((monthOccurrence) => ({
      ...event,
      monthOccurrence,
      occurrenceDate: calendarOccurrenceDate(monthOccurrence),
    }))
  );
  const householdEventDays = new Set(monthEvents.filter((event) => event.visibility === "household").map((event) => event.monthOccurrence.getDate()));
  const personalEventDays = new Set(monthEvents.filter((event) => event.visibility === "personal").map((event) => event.monthOccurrence.getDate()));
  const monthTaskItems = planningTasks.filter((task) => task.due_date?.startsWith(`${monthYear}-${String(monthIndex+1).padStart(2,"0")}-`) && taskVisibleInPlanningScope(task, planningScope, me?.id));
  const monthBillItems = planningBills.filter((bill) => bill.due_on.startsWith(`${monthYear}-${String(monthIndex+1).padStart(2,"0")}-`) && planningScope !== "me");
  const actionDays = new Set([...monthTaskItems.map((task)=>Number(task.due_date?.slice(-2))), ...monthBillItems.map((bill)=>Number(bill.due_on.slice(-2)))]);
  const selectedMonthTasks = selectedMonthDay === null ? [] : monthTaskItems.filter((task)=>Number(task.due_date?.slice(-2))===selectedMonthDay);
  const selectedMonthBills = selectedMonthDay === null ? [] : monthBillItems.filter((bill)=>Number(bill.due_on.slice(-2))===selectedMonthDay);
  const selectedMonthEvents = selectedMonthDay === null
    ? []
    : monthEvents
        .filter((event) => event.monthOccurrence.getDate() === selectedMonthDay)
        .sort((a, b) => a.title.localeCompare(b.title, locale));
  const selectedMonthDate = selectedMonthDay === null ? null : new Date(monthYear, monthIndex, selectedMonthDay);

  function moveMonth(delta: number) {
    setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
    setSelectedMonthDay(null);
  }

  function openAdd() {
    setNewVisibility(view === "personal" ? "personal" : "household");
    setShowAdd(true);
  }

  return (
    <div>
      <header className="dabo-planning-header">
        <div>
          <p className="dabo-kicker">DABO</p>
          <h1 className="dabo-planning-title">{t("planning_title")}</h1>
          <p className="dabo-planning-subtitle">{t("planning_subtitle")}</p>
        </div>
        <button onClick={openAdd} className="dabo-primary-action bg-ink text-paper px-4 py-2 text-sm font-medium">{t("add")}</button>
      </header>
      <div className="dabo-planning-controls">
        <div className="dabo-segmented" role="group" aria-label={t("planning_view_label")}>
          {(["day","week","month"] as PlanningMode[]).map((mode) => (
            <button key={mode} type="button" aria-pressed={planningMode === mode} onClick={() => { setPlanningMode(mode); changeView(mode === "month" ? "month" : "upcoming"); }} className={planningMode === mode ? "is-active" : ""}>{t(`planning_view_${mode}`)}</button>
          ))}
        </div>
        <div className="dabo-planning-scopes" role="group" aria-label={t("planning_scope_label")}>
          {(["all","me","household"] as PlanningScope[]).map((scope) => (
            <button key={scope} type="button" aria-pressed={planningScope === scope} onClick={() => setPlanningScope(scope)} className={planningScope === scope ? "is-active" : ""}>{t(`planning_scope_${scope}`)}</button>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="mx-5 mb-4 rounded-xl border border-mustard/30 bg-mustardBg px-3 py-2.5 text-sm text-ink" role="alert">
          {errorMessage}
        </div>
      )}

      {planningMode === "day" && (
        <section className="dabo-day-planner" aria-label={t("planning_day_agenda")}>
          <div className="dabo-day-nav">
            <button type="button" onClick={() => movePlanningDay(-1)} aria-label={t("planning_previous_day")}><ChevronLeft size={18}/></button>
            <button type="button" className="dabo-day-date" onClick={() => setPlanningDate(todayCivilDate())}>
              <strong>{new Intl.DateTimeFormat(locale,{weekday:"long",day:"numeric",month:"long"}).format(selectedPlanningDate)}</strong>
              <span>{planningDate === todayCivilDate() ? t("event_today") : t("planning_back_today")}</span>
            </button>
            <button type="button" onClick={() => movePlanningDay(1)} aria-label={t("planning_next_day")}><ChevronRight size={18}/></button>
          </div>
          <div className="dabo-day-summary"><Sparkles size={16}/><span>{t("planning_day_summary")}</span><strong>{dayOrganizeCount}</strong></div>
          <div className="dabo-timeline">
            {[...dayEvents.map((event) => ({ kind:"event" as const, time:event.event_time?.slice(0,5)||null, sort:event.event_time||"99:98", event })), ...daySlots.map((slot) => ({ kind:"task" as const, time:slot.start_time.slice(0,5), sort:slot.start_time, slot }))].sort((a,b)=>a.sort.localeCompare(b.sort)).map((item) => {
              if (item.kind === "event") { const event=item.event; const responsibilities=planningResponsibilities.filter((r)=>r.event_id===event.id); const pending=responsibilities.filter((r)=>r.status==="pending"); const done=responsibilities.filter((r)=>r.status==="done"); return <article key={`timeline-event-${event.id}-${event.occurrenceDate}`} className="dabo-timeline-item"><div className="dabo-timeline-time">{item.time || t("planning_all_day")}</div><div className="dabo-timeline-card"><div className="dabo-timeline-card-top"><span className="dabo-timeline-icon"><CalendarDays size={16}/></span><div><strong>{event.title}</strong><small>{event.event_time ? `${event.event_time.slice(0,5)}${event.end_time ? `–${event.end_time.slice(0,5)}`:""}` : t("planning_all_day")}</small></div></div>{pending.map((r)=><div key={r.id} className="dabo-responsibility"><button type="button" onClick={()=>completeResponsibility(r.id)} className="dabo-responsibility-check" aria-label={t("calendar_mark_done")}/><span>{r.label}{r.due_time ? ` · ${r.due_time.slice(0,5)}`:""}</span><b>{members.find((m)=>m.id===r.assigned_to)?.first_name || t("planning_to_decide")}</b></div>)}{done.length>0 && <details className="dabo-completed-responsibilities"><summary>{t("planning_completed_preparations")} · {done.length}</summary>{done.map((r)=><div key={r.id} className="dabo-responsibility is-done"><span>✓ {r.label}</span><button type="button" onClick={()=>restoreResponsibility(r.id)}>{t("calendar_restore")}</button></div>)}</details>}{event.visibility === "household" && (responsibilityEventId===event.id ? <div className="dabo-responsibility-editor"><input value={responsibilityDraft} onChange={(e)=>setResponsibilityDraft(e.target.value)} placeholder={t("planning_prepare_placeholder")}/><select value={responsibilityDraftAssignee} onChange={(e)=>setResponsibilityDraftAssignee(e.target.value)}><option value="">{t("planning_to_decide")}</option>{members.map((member)=><option key={member.id} value={member.id}>{member.first_name}</option>)}</select><button type="button" className="dabo-responsibility-details-toggle" onClick={()=>setResponsibilityDetailsOpen((value)=>!value)}>+ {t("planning_deadline_optional")}</button>{responsibilityDetailsOpen && <div className="dabo-responsibility-details"><input type="date" value={responsibilityDraftDate} onChange={(e)=>setResponsibilityDraftDate(e.target.value)}/><input type="time" value={responsibilityDraftTime} onChange={(e)=>setResponsibilityDraftTime(e.target.value)}/></div>}<div><button type="button" onClick={()=>addResponsibility(event.id)} disabled={!responsibilityDraft.trim()}>{t("add")}</button><button type="button" onClick={()=>{setResponsibilityEventId(null);setResponsibilityDetailsOpen(false);}}>{t("cancel")}</button></div></div> : <button type="button" onClick={()=>setResponsibilityEventId(event.id)} className="dabo-add-responsibility">+ {t("planning_add_preparation")}</button>)}</div></article>; }
              const task=planningTasks.find((candidate)=>candidate.id===item.slot.task_id); if(!task) return null; return <article key={`timeline-task-${item.slot.id}`} className="dabo-timeline-item"><div className="dabo-timeline-time">{item.time}</div><button type="button" onClick={()=>window.location.assign("/app/taches")} className="dabo-timeline-card dabo-timeline-task"><div className="dabo-timeline-card-top"><span className="dabo-timeline-icon"><ListChecks size={16}/></span><div><strong>{task.name}</strong><small>{item.slot.start_time.slice(0,5)}{item.slot.end_time ? `–${item.slot.end_time.slice(0,5)}`:""}{task.assigned_to ? ` · ${members.find((m)=>m.id===task.assigned_to)?.first_name || ""}`:""}</small></div></div></button></article>;
            })}
            {dayEvents.length===0 && daySlots.length===0 && <div className="dabo-free-day"><Clock3 size={18}/><div><strong>{t("planning_free_day")}</strong><span>{t("planning_free_day_hint")}</span></div></div>}
          </div>
          {(dayUnscheduledTasks.length>0 || dayBills.length>0) && <div className="dabo-unscheduled"><div className="dabo-planning-section-heading"><span>{t("planning_to_place")}</span><span>{dayUnscheduledTasks.length+dayBills.length}</span></div>{dayUnscheduledTasks.map((task)=><div key={`unscheduled-${task.id}`} className="dabo-place-row"><div><strong>{task.name}</strong><small>{durationMinutes(task.duration_key) ? `${durationMinutes(task.duration_key)} min` : t("planning_task")}{task.assigned_to ? ` · ${members.find((m)=>m.id===task.assigned_to)?.first_name || ""}`:""}</small></div>{slotTaskId===task.id ? <div className="dabo-slot-editor"><input type="time" value={slotTime} onChange={(e)=>setSlotTime(e.target.value)}/><button type="button" onClick={()=>saveTaskSlot(task)}>{t("planning_place")}</button></div> : <button type="button" onClick={()=>setSlotTaskId(task.id)}>{t("planning_plan")}</button>}</div>)}{dayBills.map((bill)=><button key={`day-bill-${bill.id}`} type="button" onClick={()=>window.location.assign("/app/finances")} className="dabo-place-row"><div><strong>{bill.label}</strong><small>{t("planning_bill")}</small></div><ReceiptText size={16}/></button>)}</div>}
        </section>
      )}

      {planningMode === "month" && (
        <section className="mx-5 mb-5 rounded-3xl border border-borderLight bg-white2 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button type="button" onClick={() => moveMonth(-1)} className="rounded-xl border border-border p-2 text-ink" aria-label={t("calendar_previous_month")}><ChevronLeft size={17} /></button>
            <div className="text-center">
              <div className="text-lg font-semibold capitalize text-ink">{monthLabel}</div>
              <button type="button" onClick={() => { setMonthCursor(new Date()); setSelectedMonthDay(null); }} className="mt-0.5 text-xs text-mustard">{t("calendar_back_today")}</button>
            </div>
            <button type="button" onClick={() => moveMonth(1)} className="rounded-xl border border-border p-2 text-ink" aria-label={t("calendar_next_month")}><ChevronRight size={17} /></button>
          </div>
          <div className="mb-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-mustard" />{t("calendar_month_household_legend")}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full border border-muted bg-paper" />{t("calendar_month_personal_legend")}</span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted">
            {["L", "M", "M", "J", "V", "S", "D"].map((day, index) => <div key={`${day}-${index}`} className="py-1">{day}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {monthCells.map((day, index) => {
              if (!day) return <div key={index} aria-hidden="true" />;
              const isToday = day === new Date().getDate() && monthIndex === new Date().getMonth() && monthYear === new Date().getFullYear();
              const isSelected = day === selectedMonthDay;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedMonthDay(day)}
                  aria-pressed={isSelected}
                  className={`relative flex aspect-square min-h-11 items-center justify-center rounded-xl text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-mustard focus-visible:ring-offset-2 ${
                    isSelected
                      ? "border-2 border-mustard bg-mustardBg font-semibold text-ink"
                      : isToday
                        ? "bg-ink text-paper font-semibold"
                        : "text-ink hover:bg-paper"
                  }`}
                >
                  {day}
                  {(householdEventDays.has(day) || personalEventDays.has(day) || actionDays.has(day)) && (
                    <span className="absolute bottom-1 flex gap-0.5" aria-hidden="true">
                      {householdEventDays.has(day) && <span className={`h-1 w-1 rounded-full ${isToday && !isSelected ? "bg-paper" : "bg-mustard"}`} />}
                      {personalEventDays.has(day) && <span className="h-1 w-1 rounded-full border border-muted bg-paper" />}
                      {actionDays.has(day) && <span className="h-1 w-1 rounded-full bg-ink/55" />}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {selectedMonthDate && (
            <div className="mt-4 border-t border-borderLight pt-4" aria-live="polite">
              <div className="text-sm font-semibold capitalize text-ink">
                {new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(selectedMonthDate)}
              </div>
              {selectedMonthEvents.length === 0 && selectedMonthTasks.length === 0 && selectedMonthBills.length === 0 ? (
                <p className="mt-2 text-sm text-muted">{t("calendar_month_no_event")}</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {selectedMonthEvents.map((event) => {
                    const occurrenceCompleted = isCalendarOccurrenceCompleted(
                      completedOccurrenceKeys,
                      event.id,
                      event.occurrenceDate
                    );

                    return (
                      <div key={`${event.id}-${event.occurrenceDate}`} className="rounded-2xl border border-borderLight bg-paper px-3 py-2.5">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0 text-sm font-medium text-ink">{event.title}</div>
                          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted">
                            {event.visibility === "personal" ? <LockKeyhole size={12} /> : <Users size={12} />}
                            {event.visibility === "personal" ? t("calendar_month_personal_legend") : t("calendar_month_household_legend")}
                          </span>
                        </div>
                        {isRecurringCalendarEvent(event) && (
                          <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted"><Repeat size={12} />{t("calendar_recurring")}</div>
                        )}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          {occurrenceCompleted ? (
                            <>
                              <span className="text-xs font-medium text-muted">{t("calendar_completed")}</span>
                              <button
                                type="button"
                                onClick={() => restoreOccurrence(event.id, event.occurrenceDate)}
                                className="rounded-lg border border-borderLight px-2.5 py-1.5 text-xs font-medium text-ink"
                              >
                                {t("calendar_restore")}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => completeOccurrence(event.id, event.occurrenceDate)}
                              className="ml-auto rounded-lg border border-borderLight px-2.5 py-1.5 text-xs font-medium text-ink"
                            >
                              {t("calendar_mark_done")}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {selectedMonthTasks.map((task)=><button key={`month-task-${task.id}`} type="button" onClick={()=>window.location.assign("/app/taches")} className="dabo-month-compact"><ListChecks size={14}/><span><strong>{task.name}</strong><small>{t("planning_task")}{planningSlots.find((slot)=>slot.task_id===task.id && slot.occurrence_date===task.due_date)?.start_time ? ` · ${planningSlots.find((slot)=>slot.task_id===task.id && slot.occurrence_date===task.due_date)?.start_time.slice(0,5)}`:""}{task.assigned_to ? ` · ${members.find((m)=>m.id===task.assigned_to)?.first_name || ""}`:""}</small></span></button>)}
                  {selectedMonthBills.map((bill)=><button key={`month-bill-${bill.id}`} type="button" onClick={()=>window.location.assign("/app/finances")} className="dabo-month-compact"><ReceiptText size={14}/><span><strong>{bill.label}</strong><small>{t("planning_bill")}</small></span></button>)}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {firstValueConfirmation && (
        <div
          className="fixed left-1/2 -translate-x-1/2 bottom-24 z-40 max-w-[calc(100%-2rem)] rounded-2xl bg-ink px-4 py-3 text-center text-xs font-medium text-paper shadow-lg"
          role="status"
          aria-live="polite"
        >
          ✓ {t("onboarding_first_value_confirmation")}
        </div>
      )}

      {showAdd && (
        <div className="mx-5 mb-5 rounded-2xl border border-borderLight bg-white2 p-4">
          <div className="mb-4">
            <div className="text-sm font-semibold text-ink">{t("calendar_new_event")}</div>
            <div className="mt-0.5 text-xs text-muted">{t("calendar_new_event_hint")}</div>
            {newVisibility === "personal" && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                <LockKeyhole size={12} />
                <span>{t("calendar_personal_private_note")}</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">{t("calendar_scope_label")}</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setNewVisibility("household")} className={`rounded-xl border px-3 py-2.5 text-left ${newVisibility === "household" ? "border-mustard bg-mustardBg" : "border-border bg-paper/30"}`}>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-ink"><Users size={14} />{t("calendar_scope_household")}</span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-muted">{t("calendar_scope_household_hint")}</span>
                </button>
                <button type="button" onClick={() => setNewVisibility("personal")} className={`rounded-xl border px-3 py-2.5 text-left ${newVisibility === "personal" ? "border-mustard bg-mustardBg" : "border-border bg-paper/30"}`}>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-ink"><LockKeyhole size={14} />{t("calendar_scope_personal")}</span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-muted">{t("calendar_scope_personal_hint")}</span>
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">{t("calendar_event_name")}</label>
              <input autoFocus placeholder={t("event_title_placeholder")} value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-ink bg-white2 text-ink" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">{t("calendar_event_date")}</label>
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-ink bg-white2 text-ink" />
            </div>

            <button
              type="button"
              onClick={() => setShowMoreOptions((value) => !value)}
              className="flex w-full items-center justify-between rounded-xl py-1.5 text-sm font-medium text-ink"
              aria-expanded={showMoreOptions}
            >
              <span>{t("calendar_more_options")}</span>
              <ChevronDown size={16} className={`text-muted transition-transform ${showMoreOptions ? "rotate-180" : ""}`} />
            </button>

            {showMoreOptions && (
              <div className="space-y-3 rounded-xl bg-paper/40 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setEventKind("event")} className={`rounded-xl border px-3 py-2 text-sm ${eventKind === "event" ? "border-mustard bg-mustardBg" : "border-border"}`}>{t("calendar_kind_event")}</button>
                  <button type="button" onClick={() => setEventKind("reminder")} className={`rounded-xl border px-3 py-2 text-sm ${eventKind === "reminder" ? "border-mustard bg-mustardBg" : "border-border"}`}>{t("calendar_kind_reminder")}</button>
                </div>
                <div><label className="text-xs text-muted block mb-1.5">{t("calendar_time")}</label><input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-white2 text-ink" /></div><div><label className="text-xs text-muted block mb-1.5">{t("planning_end_time")}</label><input type="time" min={eventTime || undefined} value={eventEndTime} onChange={(e) => setEventEndTime(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-white2 text-ink" /></div>{newVisibility === "household" && <div className="dabo-preparation-box"><label className="text-xs text-muted block mb-1.5">{t("planning_prepare_optional")}</label><input value={responsibilityLabel} onChange={(e)=>setResponsibilityLabel(e.target.value)} placeholder={t("planning_prepare_placeholder")} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-white2 text-ink" />{responsibilityLabel.trim() && <select value={responsibilityAssignee} onChange={(e)=>setResponsibilityAssignee(e.target.value)} className="mt-2 w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-white2 text-ink"><option value="">{t("planning_to_decide")}</option>{members.map((member)=><option key={member.id} value={member.id}>{member.first_name}</option>)}</select>}</div>}
                <div><label className="text-xs text-muted block mb-1.5">{t("calendar_repeat")}</label><select value={recurrenceFrequency} onChange={(e) => setRecurrenceFrequency(e.target.value as CalendarRecurrenceFrequency)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-white2 text-ink"><option value="none">{t("calendar_never")}</option><option value="daily">{t("calendar_daily")}</option><option value="weekly">{t("calendar_weekly")}</option><option value="monthly">{t("calendar_monthly")}</option><option value="yearly">{t("calendar_yearly")}</option></select></div>
                {recurrenceFrequency !== "none" && <><div><label className="text-xs text-muted block mb-1.5">{t("calendar_interval")}</label><input type="number" min={1} max={999} value={recurrenceInterval} onChange={(e) => setRecurrenceInterval(Math.max(1, Number(e.target.value) || 1))} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-white2 text-ink" /><div className="mt-1 text-[11px] text-muted">{recurrenceLabel({ event_date: eventDate || new Date().toISOString().slice(0,10), recurring: true, recurrence_frequency: recurrenceFrequency, recurrence_interval: recurrenceInterval } as CalendarEvent)}</div></div><div><label className="text-xs text-muted block mb-1.5">{t("calendar_repeat_end")}</label><input type="date" min={eventDate || undefined} value={recurrenceEndDate} onChange={(e) => setRecurrenceEndDate(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-white2 text-ink" /><div className="mt-1 text-[11px] text-muted">{t("calendar_repeat_end_hint")}</div></div></>}
                <div><label className="text-xs text-muted block mb-1.5">{t("calendar_notes")}</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-white2 text-ink" /></div>
                <div>
                  <label className="text-xs text-muted block mb-1.5">{t("event_reminder_label")}</label>
                  <select
                    value={reminderDays}
                    onChange={(e) => setReminderDays(Number(e.target.value))}
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-ink bg-white2 text-ink"
                  >
                    <option value={0}>{t("reminder_same_day")}</option>
                    <option value={1}>{t("reminder_1_day")}</option>
                    <option value={2}>{t("reminder_2_days")}</option>
                    <option value={3}>{t("reminder_3_days")}</option>
                    <option value={7}>{t("reminder_1_week")}</option>
                    <option value={14}>{t("reminder_2_weeks")}</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={addEvent}
              disabled={!title.trim() || !eventDate}
              className="flex-1 bg-ink text-paper rounded-xl py-2.5 text-sm font-medium disabled:opacity-40"
            >
              {t(eventKind === "reminder" ? "calendar_add_reminder" : "calendar_add_event")}
            </button>
            <button
              onClick={() => { setShowAdd(false); setShowMoreOptions(false); }}
              className="px-4 text-sm text-muted"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {planningMode === "week" && <section className="dabo-week-board" aria-label={t("planning_week_agenda")}>
        <div className="dabo-week-heading"><div><strong>{t("planning_week_title")}</strong><span>{t("planning_week_hint")}</span></div></div>
        <div className="dabo-week-grid">{weekDayData.map((day)=>{ const isToday=day.civil===todayCivilDate(); return <article key={day.civil} className={`dabo-week-day ${isToday?"is-today":""}`}><header><span>{new Intl.DateTimeFormat(locale,{weekday:"short"}).format(day.date)}</span><strong>{day.date.getDate()}</strong></header><div className="dabo-week-items">{day.events.map((event)=><button type="button" key={`we-${event.id}-${event.occurrenceDate}`} onClick={()=>startEditing(event)} className="dabo-week-item is-event"><span>{event.event_time?.slice(0,5)||t("planning_all_day")}</span><strong>{event.title}</strong></button>)}{day.tasks.map((task)=>{ const slot=planningSlots.find((candidate)=>candidate.task_id===task.id && candidate.occurrence_date===day.civil); return <button type="button" key={`wt-${task.id}`} onClick={()=>window.location.assign("/app/taches")} className="dabo-week-item is-task"><span>{slot?.start_time ? `${slot.start_time.slice(0,5)}${slot.end_time?`–${slot.end_time.slice(0,5)}`:""}`:t("planning_to_place_short")}</span><strong>{task.name}</strong></button>})}{day.bills.map((bill)=><button type="button" key={`wb-${bill.id}`} onClick={()=>window.location.assign("/app/finances")} className="dabo-week-item is-bill"><span>{t("planning_bill")}</span><strong>{bill.label}</strong></button>)}{day.events.length===0&&day.tasks.length===0&&day.bills.length===0&&<span className="dabo-week-empty">—</span>}</div></article>})}</div>
      </section>}

      {planningMode === "week" && editingId !== null && (<div className="dabo-planning-stream dabo-editing-stream">
        {upcoming.length === 0 && !showAdd && <EmptyState message={t("calendar_empty")} actionLabel={t("calendar_add_first")} onAction={openAdd} />}
        <div className="space-y-6 pb-6">
          {sections.map((section) => (
            <section key={section.key}>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                {section.label}
              </div>
              <div className="space-y-2">
                {section.events.map((e) => {
                  const isToday = daysUntil(e.next) === 0;
                  return (
                    <div key={e.id}>
                    <div
                      className={`dabo-calendar-event flex items-center gap-3 rounded-2xl border p-3.5 ${
                        isToday ? "dabo-calendar-event-today border-mustard/30 bg-mustardBg" : e.visibility === "personal" ? "dabo-calendar-event-personal border-borderLight bg-white2" : "dabo-calendar-event-shared border-borderLight bg-white2"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => completeOccurrence(e.id, calendarOccurrenceDate(e.next))}
                        className="w-5 h-5 rounded-full border-2 border-border shrink-0 cursor-pointer"
                        aria-label={t("calendar_mark_done")}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink truncate">{e.title}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted">
                          <span>{formatEventDate(e.next)}{e.event_time ? ` · ${e.event_time.slice(0,5)}` : ""}</span>
                          <span aria-hidden="true">·</span>
                          <span className={isToday ? "font-medium text-mustard" : ""}>{proximityLabel(e.next)}</span>
                          {isRecurringCalendarEvent(e) && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1"><Repeat size={10} />{recurrenceLabel(e)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button onClick={() => startEditing(e)} className="rounded-lg p-1.5 text-muted" aria-label={t("calendar_edit_event")}>
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setDeleteTarget(e)} className="rounded-lg p-1.5 text-muted" aria-label={t("delete")}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    {editingId === e.id && (
                      <div className="mt-2 rounded-2xl border border-borderLight bg-white2 p-4">
                        <div className="mb-4">
                          <div className="text-sm font-semibold text-ink">{t("calendar_edit_event")}</div>
                          <div className="mt-0.5 text-xs text-muted">{t("calendar_edit_event_hint")}</div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted">{t("calendar_event_name")}</label>
                            <input autoFocus value={editTitle} onChange={(event) => setEditTitle(event.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-ink bg-white2 text-ink" />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted">{t("calendar_event_date")}</label>
                            <input type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-ink bg-white2 text-ink" />
                          </div>
                          <button type="button" onClick={() => setShowEditMoreOptions((value) => !value)} className="flex w-full items-center justify-between rounded-xl py-1.5 text-sm font-medium text-ink" aria-expanded={showEditMoreOptions}>
                            <span>{t("calendar_more_options")}</span>
                            <ChevronDown size={16} className={`text-muted transition-transform ${showEditMoreOptions ? "rotate-180" : ""}`} />
                          </button>
                          {showEditMoreOptions && (
                            <div className="space-y-3 rounded-xl bg-paper/40 p-3">
                              <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setEditEventKind("event")} className={`rounded-xl border px-3 py-2 text-sm ${editEventKind === "event" ? "border-mustard bg-mustardBg" : "border-border"}`}>{t("calendar_kind_event")}</button><button type="button" onClick={() => setEditEventKind("reminder")} className={`rounded-xl border px-3 py-2 text-sm ${editEventKind === "reminder" ? "border-mustard bg-mustardBg" : "border-border"}`}>{t("calendar_kind_reminder")}</button></div>
                              <div><label className="text-xs text-muted block mb-1.5">{t("calendar_time")}</label><input type="time" value={editEventTime} onChange={(e) => setEditEventTime(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-white2 text-ink" /></div><div><label className="text-xs text-muted block mb-1.5">{t("planning_end_time")}</label><input type="time" min={editEventTime || undefined} value={editEventEndTime} onChange={(e) => setEditEventEndTime(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-white2 text-ink" /></div>
                              <div><label className="text-xs text-muted block mb-1.5">{t("calendar_repeat")}</label><select value={editRecurrenceFrequency} onChange={(e) => setEditRecurrenceFrequency(e.target.value as CalendarRecurrenceFrequency)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-white2 text-ink"><option value="none">{t("calendar_never")}</option><option value="daily">{t("calendar_daily")}</option><option value="weekly">{t("calendar_weekly")}</option><option value="monthly">{t("calendar_monthly")}</option><option value="yearly">{t("calendar_yearly")}</option></select></div>
                              {editRecurrenceFrequency !== "none" && <><div><label className="text-xs text-muted block mb-1.5">{t("calendar_interval")}</label><input type="number" min={1} max={999} value={editRecurrenceInterval} onChange={(e) => setEditRecurrenceInterval(Math.max(1, Number(e.target.value) || 1))} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-white2 text-ink" /></div><div><label className="text-xs text-muted block mb-1.5">{t("calendar_repeat_end")}</label><input type="date" min={editDate || undefined} value={editRecurrenceEndDate} onChange={(e) => setEditRecurrenceEndDate(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-white2 text-ink" /></div></>}
                              <div><label className="text-xs text-muted block mb-1.5">{t("calendar_notes")}</label><textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-white2 text-ink" /></div>
                              <div>
                                <label className="text-xs text-muted block mb-1.5">{t("event_reminder_label")}</label>
                                <select value={editReminderDays} onChange={(event) => setEditReminderDays(Number(event.target.value))} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-ink bg-white2 text-ink">
                                  <option value={0}>{t("reminder_same_day")}</option>
                                  <option value={1}>{t("reminder_1_day")}</option>
                                  <option value={2}>{t("reminder_2_days")}</option>
                                  <option value={3}>{t("reminder_3_days")}</option>
                                  <option value={7}>{t("reminder_1_week")}</option>
                                  <option value={14}>{t("reminder_2_weeks")}</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="mt-4 flex gap-2">
                          <button onClick={saveEvent} disabled={!editTitle.trim() || !editDate} className="flex-1 bg-ink text-paper rounded-xl py-2.5 text-sm font-medium disabled:opacity-40">
                            {t("calendar_save_changes")}
                          </button>
                          <button onClick={cancelEditing} className="px-4 text-sm text-muted">{t("cancel")}</button>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>)}

      {responsibilityFeedback && <div className="dabo-planning-toast" role="status" aria-live="polite"><span>✓ {t("planning_preparation_completed")}</span><button type="button" onClick={()=>restoreResponsibility(responsibilityFeedback.id)}>{t("planning_undo")}</button><button type="button" aria-label={t("close")} onClick={()=>setResponsibilityFeedback(null)}>×</button></div>}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-4 pb-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="calendar-delete-title"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-borderLight bg-white2 p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-paper text-muted">
              <Trash2 size={18} />
            </div>
            <div id="calendar-delete-title" className="text-center text-base font-semibold text-ink">
              {t("calendar_delete_title")}
            </div>
            <div className="mt-2 text-center text-sm leading-5 text-muted">
              {t("calendar_delete_intro")} <span className="font-medium text-ink">“{deleteTarget.title}”</span>.
            </div>
            {deleteTarget.recurring && (
              <div className="mt-3 rounded-2xl bg-paper/60 px-3 py-2.5 text-center text-xs leading-5 text-muted">
                {t("calendar_delete_recurring_note")}
              </div>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-ink"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={() => remove(deleteTarget.id)}
                className="flex-1 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-paper"
              >
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
