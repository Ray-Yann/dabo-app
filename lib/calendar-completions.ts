import type { CalendarEvent } from "./types";
import {
  isRecurringCalendarEvent,
  occurrenceOnOrAfter,
} from "./calendar-recurrence";

type CalendarCompletionEvent =
  Pick<CalendarEvent, "id" | "event_date" | "recurring"> &
  Partial<
    Pick<
      CalendarEvent,
      "recurrence_frequency" | "recurrence_interval" | "recurrence_end_date"
    >
  >;

export type CalendarEventCompletion = {
  event_id: string;
  occurrence_date: string;
  completed_by?: string;
  completed_at?: string;
};

export function calendarOccurrenceDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function calendarOccurrenceKey(
  eventId: string,
  occurrenceDate: string
): string {
  return `${eventId}:${occurrenceDate}`;
}

export function calendarCompletedOccurrenceSet(
  completions: Array<Pick<CalendarEventCompletion, "event_id" | "occurrence_date">>
): Set<string> {
  return new Set(
    completions.map((completion) =>
      calendarOccurrenceKey(completion.event_id, completion.occurrence_date)
    )
  );
}

export function isCalendarOccurrenceCompleted(
  completedOccurrences: ReadonlySet<string>,
  eventId: string,
  occurrenceDate: string
): boolean {
  return completedOccurrences.has(
    calendarOccurrenceKey(eventId, occurrenceDate)
  );
}

export function nextUncompletedOccurrence(
  event: CalendarCompletionEvent,
  completedOccurrences: ReadonlySet<string>,
  from = new Date(),
  maxIterations = 400
): Date | null {
  let occurrence = occurrenceOnOrAfter(event, from);

  for (let index = 0; occurrence && index < maxIterations; index += 1) {
    const occurrenceDate = calendarOccurrenceDate(occurrence);

    if (
      !isCalendarOccurrenceCompleted(
        completedOccurrences,
        event.id,
        occurrenceDate
      )
    ) {
      return occurrence;
    }

    if (!isRecurringCalendarEvent(event)) {
      return null;
    }

    const nextSearchDate = new Date(occurrence);
    nextSearchDate.setDate(nextSearchDate.getDate() + 1);
    occurrence = occurrenceOnOrAfter(event, nextSearchDate);
  }

  return null;
}
