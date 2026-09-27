export type HouseholdInboxDestination =
  | "shopping"
  | "task"
  | "calendar"
  | "finance"
  | "unknown";

export type HouseholdInboxFinanceKind =
  | "expense"
  | "bill"
  | "reference"
  | null;

export type HouseholdInboxInterpretation = {
  destination: HouseholdInboxDestination;
  title: string;
  financeKind: HouseholdInboxFinanceKind;
  date: string | null;
  time: string | null;
};

export type HouseholdInboxOptions = {
  referenceDate?: string;
};

const WEEKDAYS: Record<string, number> = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
};

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalize(value: string) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseCivilDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatCivilDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addCivilDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function resolveDate(
  normalized: string,
  referenceDate?: string
): string | null {
  if (!referenceDate) return null;

  const reference = parseCivilDate(referenceDate);
  if (!reference) return null;

  if (/\bdemain\b/.test(normalized)) {
    return formatCivilDate(addCivilDays(reference, 1));
  }

  for (const [weekday, targetDay] of Object.entries(WEEKDAYS)) {
    if (!new RegExp(`\\b${weekday}\\b`).test(normalized)) continue;

    let delta = (targetDay - reference.getDay() + 7) % 7;
    if (delta === 0) delta = 7;

    return formatCivilDate(addCivilDays(reference, delta));
  }

  return null;
}

function resolveTime(normalized: string): string | null {
  const match = /\b([01]?\d|2[0-3])h([0-5]\d)?\b/.exec(normalized);
  if (!match) return null;

  return `${match[1].padStart(2, "0")}:${match[2] || "00"}`;
}

function baseResult(
  destination: HouseholdInboxDestination,
  title: string,
  financeKind: HouseholdInboxFinanceKind,
  date: string | null,
  time: string | null
): HouseholdInboxInterpretation {
  return { destination, title, financeKind, date, time };
}

export function interpretHouseholdInbox(
  input: string,
  options: HouseholdInboxOptions = {}
): HouseholdInboxInterpretation {
  const text = clean(input);
  const normalized = normalize(text);
  const date = resolveDate(normalized, options.referenceDate);
  const time = resolveTime(normalized);

  if (!text) {
    return baseResult("unknown", "", null, null, null);
  }

  if (/\b(facture|loyer|echeance)\b/.test(normalized)) {
    return baseResult("finance", text, "bill", date, time);
  }

  if (
    /\b(rendez-vous|rendez vous|rdv|dentiste|medecin|docteur)\b/.test(normalized) &&
    (
      /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/.test(normalized) ||
      /\b\d{1,2}h(?:\d{2})?\b/.test(normalized)
    )
  ) {
    const title = clean(
      text
        .replace(/\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b.*$/i, "")
        .replace(/\b\d{1,2}h(?:\d{2})?\b.*$/i, "")
    );

    return baseResult("calendar", title || text, null, date, time);
  }

  if (/^(acheter|prendre|racheter|commander)\b/i.test(normalized)) {
    const title = clean(
      text
        .replace(/^(acheter|prendre|racheter|commander)\s+/i, "")
        .replace(/^(du|de la|de l'|des)\s*/i, "")
        .replace(/\s+\bdemain\b.*$/i, "")
    );

    return baseResult("shopping", title || text, null, date, time);
  }

  if (/^(nettoyer|ranger|laver|aspirer|repasser|sortir)\b/i.test(normalized)) {
    return baseResult("task", text, null, date, time);
  }

  return baseResult("unknown", text, null, date, time);
}

export function buildHouseholdInboxHref(
  interpretation: HouseholdInboxInterpretation
): string | null {
  const { destination, title, financeKind, date, time } = interpretation;

  if (destination === "unknown") {
    return null;
  }

  if (destination === "finance" && !financeKind) {
    return null;
  }

  const params = new URLSearchParams();

  if (destination === "shopping") {
    params.set("first", "1");
    params.set("inbox", "1");
    params.set("name", title);
    if (date) params.set("date", date);

    return `/app/courses?${params.toString()}`;
  }

  if (destination === "task") {
    params.set("first", "1");
    params.set("inbox", "1");
    params.set("name", title);
    if (date) params.set("date", date);

    return `/app/taches?${params.toString()}`;
  }

  if (destination === "calendar") {
    params.set("first", "1");
    params.set("inbox", "1");
    params.set("title", title);
    if (date) params.set("date", date);
    if (time) params.set("time", time);

    return `/app/calendrier?${params.toString()}`;
  }

  if (destination === "finance" && financeKind) {
    params.set("inbox", "1");
    params.set("kind", financeKind);
    params.set("label", title);
    if (date) params.set("date", date);

    return `/app/finances?${params.toString()}`;
  }

  return null;
}

export type ShoppingInboxPrefill = {
  name: string;
  dueDate: string;
};

function safeInboxCivilDate(value: string | null): string {
  if (!value) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

export function readShoppingInboxPrefill(
  params: URLSearchParams
): ShoppingInboxPrefill | null {
  if (params.get("inbox") !== "1") {
    return null;
  }

  const name = clean(params.get("name") || "");

  if (!name) {
    return null;
  }

  return {
    name,
    dueDate: safeInboxCivilDate(params.get("date")),
  };
}

export type TaskInboxPrefill = {
  name: string;
  dueDate: string;
};

export function readTaskInboxPrefill(
  params: URLSearchParams
): TaskInboxPrefill | null {
  if (params.get("inbox") !== "1") {
    return null;
  }

  const name = clean(params.get("name") || "");

  if (!name) {
    return null;
  }

  return {
    name,
    dueDate: safeInboxCivilDate(params.get("date")),
  };
}

export type CalendarInboxPrefill = {
  title: string;
  eventDate: string;
  eventTime: string;
};

function safeInboxTime(value: string | null): string {
  if (!value) return "";
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : "";
}

export function readCalendarInboxPrefill(
  params: URLSearchParams
): CalendarInboxPrefill | null {
  if (params.get("inbox") !== "1") {
    return null;
  }

  const title = clean(params.get("title") || "");

  if (!title) {
    return null;
  }

  return {
    title,
    eventDate: safeInboxCivilDate(params.get("date")),
    eventTime: safeInboxTime(params.get("time")),
  };
}



export type FinanceInboxPrefill = {
  kind: Exclude<HouseholdInboxFinanceKind, null>;
  label: string;
  date: string;
};

export function readFinanceInboxPrefill(
  params: URLSearchParams
): FinanceInboxPrefill | null {
  if (params.get("inbox") !== "1") return null;

  const kind = params.get("kind");

  if (
    kind !== "expense" &&
    kind !== "bill" &&
    kind !== "reference"
  ) {
    return null;
  }

  const label = clean(params.get("label") || "");
  if (!label) return null;

  return {
    kind,
    label,
    date: safeInboxCivilDate(params.get("date")),
  };
}
