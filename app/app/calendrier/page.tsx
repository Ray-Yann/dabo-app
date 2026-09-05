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
import { Trash2, Repeat, PartyPopper, CalendarDays, ChevronDown } from "lucide-react";

export default function CalendarPage() {
  const { loading, household, me, members, supabase } = useHousehold();
  const t = useT();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [reminderDays, setReminderDays] = useState(7);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  async function loadEvents() {
    if (!household) return;
    const { data } = await supabase.from("calendar_events").select("*").eq("household_id", household.id);
    setEvents((data as CalendarEvent[]) || []);
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (household) loadEvents();
  }, [household]);

  async function addEvent() {
    if (!title.trim() || !eventDate || !household) return;
    await supabase.from("calendar_events").insert({
      household_id: household.id,
      created_by: me?.id || null,
      title: title.trim(),
      event_date: eventDate,
      recurring,
      reminder_days_before: reminderDays,
    });
    setTitle("");
    setEventDate("");
    setRecurring(false);
    setReminderDays(7);
    setShowMoreOptions(false);
    setShowAdd(false);
    loadEvents();
  }

  async function remove(id: string) {
    if (!confirm(t("confirm_delete_event"))) return;
    await supabase.from("calendar_events").delete().eq("id", id);
    loadEvents();
  }

  if (loading || !household) return <LoadingState />;

  const locale = me?.language === "nl" ? "nl-BE" : me?.language === "en" ? "en-GB" : "fr-BE";

  function formatEventDate(date: Date) {
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(date);
  }

  function proximityLabel(date: Date) {
    const days = daysUntil(date);
    if (days === 0) return t("event_today");
    if (days === 1) return t("event_tomorrow");
    return `${t("event_in")} ${days} ${t("event_days")}`;
  }

  const upcoming = events
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

  return (
    <div>
      <div className="flex items-start justify-between px-5 pt-8 pb-4">
        <Header title={t("calendar_title")} />
        <button onClick={() => setShowAdd(true)} className="bg-ink text-paper rounded-xl px-4 py-2 text-sm font-medium mt-8 mr-0">
          {t("add")}
        </button>
      </div>
      <IntroTip id="calendar-v2" title={t("intro_calendar_title")} text={t("intro_calendar")} />

      {showAdd && (
        <div className="mx-5 mb-5 rounded-2xl border border-borderLight bg-white2 p-4">
          <div className="mb-4">
            <div className="text-sm font-semibold text-ink">{t("calendar_new_event")}</div>
            <div className="mt-0.5 text-xs text-muted">{t("calendar_new_event_hint")}</div>
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

      <div className="px-5">
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
                    <div
                      key={e.id}
                      className={`flex items-center gap-3 rounded-2xl border p-3.5 ${
                        isToday ? "border-mustard/30 bg-mustardBg" : "border-borderLight bg-white2"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isToday ? "bg-paper text-mustard" : "bg-mustardBg text-mustard"}`}>
                        {e.recurring ? <PartyPopper size={17} /> : <CalendarDays size={17} />}
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
                      <button onClick={() => remove(e.id)} className="rounded-lg p-1.5 text-muted" aria-label={t("delete")}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
