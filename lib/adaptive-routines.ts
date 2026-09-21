import type { RoutineFrequency } from "./types";

export type AdaptiveRoutineOccurrence = {
  dueDate: string;
  completedAt: string;
};

export type AdaptiveRoutineSuggestion = {
  frequency: RoutineFrequency;
  customDays: number[] | null;
  anchorWeekday: number | null;
  observedWeekday: number;
  coherentOccurrences: number;
  observedOccurrences: number;
  confidence: number;
  reason: "stable_weekday_drift";
};

const MIN_COMPLETED_OCCURRENCES = 3;
const MAX_OBSERVED_OCCURRENCES = 4;
const MIN_COHERENT_OCCURRENCES = 3;

function civilWeekday(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid civil date: ${value}`);

  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  ).getUTCDay();
}

function completedCivilDate(completedAt: string, timeZone: string): string {
  const date = new Date(completedAt);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid completion timestamp: ${completedAt}`);
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error(`Could not resolve civil date in timezone: ${timeZone}`);
  }

  return `${year}-${month}-${day}`;
}

function dominantWeekday(values: number[]): {
  weekday: number;
  count: number;
} | null {
  const counts = new Map<number, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  let winner: { weekday: number; count: number } | null = null;

  for (const [weekday, count] of counts) {
    if (!winner || count > winner.count) {
      winner = { weekday, count };
    } else if (count === winner.count) {
      winner = null;
    }
  }

  return winner;
}

export function detectAdaptiveRoutineSuggestion(input: {
  timeZone: string;
  frequency: RoutineFrequency;
  customDays?: number[] | null;
  anchorDate?: string | null;
  occurrences: AdaptiveRoutineOccurrence[];
}): AdaptiveRoutineSuggestion | null {
  const completed = input.occurrences
    .filter((occurrence) => occurrence.dueDate && occurrence.completedAt)
    .sort(
      (a, b) =>
        new Date(b.completedAt).getTime() -
        new Date(a.completedAt).getTime()
    )
    .slice(0, MAX_OBSERVED_OCCURRENCES);

  if (completed.length < MIN_COMPLETED_OCCURRENCES) return null;

  const completionWeekdays = completed.map((occurrence) =>
    civilWeekday(completedCivilDate(occurrence.completedAt, input.timeZone))
  );

  const dominant = dominantWeekday(completionWeekdays);
  if (!dominant || dominant.count < MIN_COHERENT_OCCURRENCES) return null;

  const declaredWeekdays =
    input.frequency === "custom"
      ? [...new Set(input.customDays ?? [])]
      : input.frequency === "weekly" || input.frequency === "biweekly"
        ? input.anchorDate
          ? [civilWeekday(input.anchorDate)]
          : [civilWeekday(completed[completed.length - 1].dueDate)]
        : [];

  // V1 only adapts single-day custom routines.
  // Replacing a multi-day schedule from observed completions could silently
  // destroy intentional recurrence days chosen by the household.
  if (input.frequency === "custom" && declaredWeekdays.length !== 1) {
    return null;
  }

  // V1 intentionally handles weekday drift only for weekly-style routines.
  // Daily, monthly and yearly cadence learning can be added separately later.
  if (
    input.frequency !== "weekly" &&
    input.frequency !== "biweekly" &&
    input.frequency !== "custom"
  ) {
    return null;
  }

  if (declaredWeekdays.includes(dominant.weekday)) return null;

  return {
    frequency: input.frequency,
    customDays:
      input.frequency === "custom" ? [dominant.weekday] : null,
    anchorWeekday: dominant.weekday,
    observedWeekday: dominant.weekday,
    coherentOccurrences: dominant.count,
    observedOccurrences: completed.length,
    confidence: dominant.count / completed.length,
    reason: "stable_weekday_drift",
  };
}


function addCivilDays(value: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid civil date: ${value}`);

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  );
  date.setUTCDate(date.getUTCDate() + days);

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function realignPendingRoutineDueDate(
  currentDueDate: string,
  targetWeekday: number
): string {
  if (!Number.isInteger(targetWeekday) || targetWeekday < 0 || targetWeekday > 6) {
    throw new Error(`Invalid target weekday: ${targetWeekday}`);
  }

  const currentWeekday = civilWeekday(currentDueDate);
  const forwardDays = (targetWeekday - currentWeekday + 7) % 7;

  return addCivilDays(currentDueDate, forwardDays);
}
