"use client";

import { useEffect, useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { useHousehold } from "@/lib/use-household";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { IntroTip } from "@/components/IntroTip";
import { CalendarEvent } from "@/lib/types";
import { nextOccurrence, daysUntil } from "@/lib/utils";
import { useT } from "@/lib/language-context";
import { trackAcquisitionEvent } from "@/lib/acquisition";
import { Trash2, Repeat, PartyPopper, CalendarDays, ChevronDown, Pencil, LockKeyhole } from "lucide-react";

type CalendarView = "upcoming" | "month" | "personal";

export default function CalendarPage() {
  const { loading, household, me, supabase } = useHousehold();
  const t = useT();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<CalendarView>("upcoming");
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [reminderDays, setReminderDays] = useState(7);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editRecurring, setEditRecurring] = useState(false);
  const [editReminderDays, setEditReminderDays] = useState(7);
  const [showEditMoreOptions, setShowEditMoreOptions] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadEvents() {
    if (!household) return;
    const { data, error } = await supabase.from("calendar_events").select("*").eq("household_id", household.id);
    if (error) {
      setErrorMessage(t("calendar_error_load"));
      return;
    }
    setErrorMessage("");
    setEvents((data as CalendarEvent[]) || []);
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (household) loadEvents();
  }, [household]);

  async function addEvent() {
    if (!title.trim() || !eventDate || !household || !me) return;
    const { error } = await supabase.from("calendar_events").insert({
      household_id: household.id,
      created_by: me.id,
      title: title.trim(),
      event_date: eventDate,
      recurring,
      reminder_days_before: reminderDays,
      visibility: view === "personal" ? "personal" : "household",
      private_owner_id: view === "personal" ? me.id : null,
    });
    if (error) {
      setErrorMessage(t("calendar_error_save"));
      return;
    }
    void trackAcquisitionEvent("first_value", { householdId: household.id, valueType: "calendar" });
    setErrorMessage("");
    setTitle("");
    setEventDate("");
    setRecurring(false);
    setReminderDays(7);
    setShowMoreOptions(false);
    setShowAdd(false);
    loadEvents();
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
    setEditRecurring(event.recurring);
    setEditReminderDays(event.reminder_days_before ?? 7);
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
        recurring: editRecurring,
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

  const visibleEvents = events.filter((event) =>
    view === "personal"
      ? event.visibility === "personal" && event.private_owner_id === me?.id
      : event.visibility === "household"
  );

  const upcoming = visibleEvents
    .map((e) => ({ ...e, next: nextOccurrence(e.event_date, e.recurring) }))
    .filter((e) => e.recurring || e.next.getTime() >= new Date(new Date().setHours(0, 0, 0, 0)).getTime())
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

  const monthDate = new Date();
  const monthYear = monthDate.getFullYear();
  const monthIndex = monthDate.getMonth();
  const firstWeekday = (new Date(monthYear, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(monthYear, monthIndex + 1, 0).getDate();
  const monthCells = Array.from({ length: firstWeekday + daysInMonth }, (_, index) => index < firstWeekday ? null : index - firstWeekday + 1);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(monthDate);
  const eventDays = new Set(upcoming.filter((event) => event.next.getFullYear() === monthYear && event.next.getMonth() === monthIndex).map((event) => event.next.getDate()));

  return (
    <div>
      <div className="flex items-start justify-between px-5 pt-8 pb-4">
        <Header title={t("calendar_title")} />
        <button onClick={() => setShowAdd(true)} className="bg-ink text-paper rounded-xl px-4 py-2 text-sm font-medium mt-8 mr-0">
          {t("add")}
        </button>
      </div>
      <div className="px-5 mb-5">
        <label className="block text-sm font-medium text-muted mb-2">{t("ux_view_label")}</label>
        <select value={view} onChange={(e) => changeView(e.target.value as CalendarView)} className="w-full rounded-2xl border border-borderLight bg-paper px-4 py-3 text-base font-semibold text-ink outline-none focus:border-ink">
          <option value="upcoming">{t("ux_calendar_upcoming")}</option>
          <option value="month">{t("ux_calendar_month")}</option>
          <option value="personal">{t("calendar_tab_personal")}</option>
        </select>
      </div>

      {view === "personal" && <IntroTip
        id="calendar-personal-v1"
        title={t("intro_calendar_personal_title")}
        text={t("intro_calendar_personal")}
      />}

      {errorMessage && (
        <div className="mx-5 mb-4 rounded-xl border border-mustard/30 bg-mustardBg px-3 py-2.5 text-sm text-ink" role="alert">
          {errorMessage}
        </div>
      )}

      {view === "month" && (
        <section className="mx-5 mb-5 rounded-3xl border border-borderLight bg-white2 p-4">
          <div className="mb-4 text-lg font-semibold capitalize text-ink">{monthLabel}</div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted">
            {["L", "M", "M", "J", "V", "S", "D"].map((day, index) => <div key={`${day}-${index}`} className="py-1">{day}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {monthCells.map((day, index) => (
              <div key={index} className={`relative flex aspect-square items-center justify-center rounded-xl text-sm ${day === monthDate.getDate() ? "bg-ink text-paper font-semibold" : "text-ink"}`}>
                {day ?? ""}
                {day && eventDays.has(day) && <span className={`absolute bottom-1 h-1 w-1 rounded-full ${day === monthDate.getDate() ? "bg-paper" : "bg-mustard"}`} />}
              </div>
            ))}
          </div>
        </section>
      )}

      {showAdd && (
        <div className="mx-5 mb-5 rounded-2xl border border-borderLight bg-white2 p-4">
          <div className="mb-4">
            <div className="text-sm font-semibold text-ink">{t("calendar_new_event")}</div>
            <div className="mt-0.5 text-xs text-muted">{t("calendar_new_event_hint")}</div>
            {view === "personal" && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                <LockKeyhole size={12} />
                <span>{t("calendar_personal_private_note")}</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
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
                <label className="flex items-center gap-2.5 text-sm text-ink">
                  <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
                  {t("event_recurring")}
                </label>
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
              {t("calendar_add_event")}
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

      {view !== "month" && (<div className="px-5">
        {upcoming.length === 0 && !showAdd && <EmptyState message={t("calendar_empty")} actionLabel={t("calendar_add_first")} onAction={() => setShowAdd(true)} />}
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
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isToday ? "bg-paper text-mustard" : "bg-mustardBg text-mustard"}`}>
                        {e.visibility === "personal" ? <LockKeyhole size={17} /> : e.recurring ? <PartyPopper size={17} /> : <CalendarDays size={17} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink truncate">{e.title}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted">
                          <span>{formatEventDate(e.next)}</span>
                          <span aria-hidden="true">·</span>
                          <span className={isToday ? "font-medium text-mustard" : ""}>{proximityLabel(e.next)}</span>
                          {e.recurring && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1"><Repeat size={10} />{t("event_every_year")}</span>
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
                              <label className="flex items-center gap-2.5 text-sm text-ink">
                                <input type="checkbox" checked={editRecurring} onChange={(event) => setEditRecurring(event.target.checked)} />
                                {t("event_recurring")}
                              </label>
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
