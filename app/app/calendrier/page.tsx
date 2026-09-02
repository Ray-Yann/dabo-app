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
import { Trash2, Repeat, PartyPopper } from "lucide-react";

export default function CalendarPage() {
  const { loading, household, me, members, supabase } = useHousehold();
  const t = useT();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [recurring, setRecurring] = useState(true);
  const [reminderDays, setReminderDays] = useState(7);

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
    setRecurring(true);
    setReminderDays(7);
    setShowAdd(false);
    loadEvents();
  }

  async function remove(id: string) {
    if (!confirm(t("confirm_delete_event"))) return;
    await supabase.from("calendar_events").delete().eq("id", id);
    loadEvents();
  }

  if (loading || !household) return <LoadingState />;

  const upcoming = events
    .map((e) => ({ ...e, next: nextOccurrence(e.event_date, e.recurring) }))
    .filter((e) => e.recurring || e.next.getTime() >= new Date(new Date().setHours(0, 0, 0, 0)).getTime())
    .sort((a, b) => a.next.getTime() - b.next.getTime());

  return (
    <div>
      <div className="flex items-start justify-between px-5 pt-8 pb-4">
        <Header title={t("calendar_title")} />
        <button onClick={() => setShowAdd(true)} className="bg-ink text-paper rounded-xl px-4 py-2 text-sm font-medium mt-8 mr-0">
          {t("add")}
        </button>
      </div>
      <IntroTip id="calendar" text={t("intro_calendar")} />

      {showAdd && (
        <div className="mx-5 mb-4 bg-white2 rounded-2xl p-4 space-y-2">
          <input autoFocus placeholder={t("event_title_placeholder")} value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink bg-white2 text-ink" />
          <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink bg-white2 text-ink" />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
            {t("event_recurring")}
          </label>
          <div>
            <label className="text-xs text-muted block mb-1">{t("event_reminder_label")}</label>
            <select
              value={reminderDays}
              onChange={(e) => setReminderDays(Number(e.target.value))}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-ink bg-white2 text-ink"
            >
              <option value={0}>{t("reminder_same_day")}</option>
              <option value={1}>{t("reminder_1_day")}</option>
              <option value={2}>{t("reminder_2_days")}</option>
              <option value={3}>{t("reminder_3_days")}</option>
              <option value={7}>{t("reminder_1_week")}</option>
              <option value={14}>{t("reminder_2_weeks")}</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={addEvent} className="flex-1 bg-ink text-paper rounded-xl py-2 text-sm font-medium">{t("add")}</button>
            <button onClick={() => setShowAdd(false)} className="px-4 text-sm text-muted">{t("cancel")}</button>
          </div>
        </div>
      )}

      <div className="px-5">
        {upcoming.length === 0 && !showAdd && <EmptyState message={t("calendar_empty")} actionLabel={t("calendar_add_first")} onAction={() => setShowAdd(true)} />}
        <div className="space-y-1">
          {upcoming.map((e) => {
            const days = daysUntil(e.next);
            return (
              <div key={e.id} className="flex items-center gap-3 py-3 border-b border-borderLight">
                <div className="w-9 h-9 rounded-full bg-mustardBg flex items-center justify-center shrink-0 text-mustard">
                  <PartyPopper size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ink flex items-center gap-1.5">
                    {e.recurring && <Repeat size={11} className="text-muted" />}
                    {e.title}
                  </div>
                  <div className="text-[11px] text-muted">
                    {days === 0 ? t("event_today") : days === 1 ? t("event_tomorrow") : `${t("event_in")} ${days} ${t("event_days")}`}
                  </div>
                </div>
                <button onClick={() => remove(e.id)} className="text-muted"><Trash2 size={16} /></button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
