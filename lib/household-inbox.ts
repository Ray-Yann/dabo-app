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

export type HouseholdInboxFinanceRecurrence =
  | "monthly"
  | "yearly"
  | null;

export type HouseholdInboxInterpretation = {
  destination: HouseholdInboxDestination;
  title: string;
  financeKind: HouseholdInboxFinanceKind;
  date: string | null;
  time: string | null;
  amount?: string | null;
  recurrence?: HouseholdInboxFinanceRecurrence;
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

function resolveExplicitCivilDate(normalized: string): string | null {
  const match = /\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})\b/.exec(normalized);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  const candidate = parseCivilDate(
    `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  );

  return candidate ? formatCivilDate(candidate) : null;
}

function resolveDate(
  normalized: string,
  referenceDate?: string
): string | null {
  const explicit = resolveExplicitCivilDate(normalized);
  if (explicit) return explicit;

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

function resolveAmount(text: string): string | null {
  const match = /(?:^|\s)(\d+(?:[.,]\d{1,2})?)\s*(?:€|euros?\b)/i.exec(text);
  if (!match) return null;

  const normalizedAmount = match[1].replace(",", ".");
  const value = Number(normalizedAmount);

  if (!Number.isFinite(value) || value < 0) return null;

  return normalizedAmount;
}

function resolveMonthlyDueDate(
  normalized: string,
  referenceDate?: string
): string | null {
  const match = /\bchaque\s+(\d{1,2})\s+du\s+mois\b/.exec(normalized);
  if (!match || !referenceDate) return null;

  const reference = parseCivilDate(referenceDate);
  if (!reference) return null;

  const targetDay = Number(match[1]);
  if (targetDay < 1 || targetDay > 31) return null;

  const candidateFor = (year: number, monthIndex: number) => {
    const candidate = new Date(year, monthIndex, targetDay);

    if (
      candidate.getFullYear() !== year ||
      candidate.getMonth() !== monthIndex ||
      candidate.getDate() !== targetDay
    ) {
      return null;
    }

    return candidate;
  };

  let candidate = candidateFor(
    reference.getFullYear(),
    reference.getMonth()
  );

  if (candidate && candidate >= reference) {
    return formatCivilDate(candidate);
  }

  const nextMonth = new Date(
    reference.getFullYear(),
    reference.getMonth() + 1,
    1
  );

  candidate = candidateFor(
    nextMonth.getFullYear(),
    nextMonth.getMonth()
  );

  return candidate ? formatCivilDate(candidate) : null;
}

function cleanCalendarTitle(text: string) {
  return clean(
    text
      .replace(/\s+\ble\s+\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}\b/gi, "")
      .replace(/\s+(?:à|a)\s+\d{1,2}h(?:\d{2})?\b/gi, "")
      .replace(/\s+\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b.*$/i, "")
      .replace(/\s+\b\d{1,2}h(?:\d{2})?\b.*$/i, "")
      .replace(/[\s.!?,;:]+$/g, "")
  );
}

function cleanFinanceBillTitle(text: string) {
  return clean(
    text
      .replace(/^\s*facture\s+(?:de|du|d'|d’)?\s*/i, "")
      .replace(/\s+\d+(?:[.,]\d{1,2})?\s*(?:€|euros?\b)/gi, "")
      .replace(/\s+\bchaque\s+\d{1,2}\s+du\s+mois\b/gi, "")
      .replace(/\s+\bdemain\b/gi, "")
      .replace(/[\s.!?,;:]+$/g, "")
  );
}

function baseResult(
  destination: HouseholdInboxDestination,
  title: string,
  financeKind: HouseholdInboxFinanceKind,
  date: string | null,
  time: string | null,
  amount: string | null = null,
  recurrence: HouseholdInboxFinanceRecurrence = null
): HouseholdInboxInterpretation {
  return {
    destination,
    title,
    financeKind,
    date,
    time,
    amount,
    recurrence,
  };
}

export function interpretHouseholdInbox(
  input: string,
  options: HouseholdInboxOptions = {}
): HouseholdInboxInterpretation {
  const text = clean(input);
  const normalized = normalize(text);
  const resolvedDate = resolveDate(normalized, options.referenceDate);
  const time = resolveTime(normalized);

  if (!text) {
    return baseResult("unknown", "", null, null, null);
  }

  if (/\b(facture|loyer|echeance)\b/.test(normalized)) {
    const amount = resolveAmount(text);
    const monthly = /\bchaque\s+\d{1,2}\s+du\s+mois\b/.test(normalized);
    const monthlyDate = monthly
      ? resolveMonthlyDueDate(normalized, options.referenceDate)
      : null;

    const title = /\bfacture\b/.test(normalized)
      ? cleanFinanceBillTitle(text)
      : clean(text.replace(/\s+\bdemain\b[\s.!?,;:]*$/i, ""));

    return baseResult(
      "finance",
      title || text,
      "bill",
      monthlyDate || resolvedDate,
      time,
      amount,
      monthly ? "monthly" : null
    );
  }

  const hasCalendarKeyword =
    /\b(rendez-vous|rendez vous|rdv|dentiste|medecin|docteur)\b/.test(normalized);

  const hasWeekday =
    /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/.test(normalized);

  const hasExplicitCivilDate =
    /\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}\b/.test(normalized);

  const hasExplicitTime =
    /\b\d{1,2}h(?:\d{2})?\b/.test(normalized);

  if (
    (hasCalendarKeyword && (hasWeekday || hasExplicitTime || hasExplicitCivilDate)) ||
    (hasExplicitCivilDate && hasExplicitTime && resolvedDate)
  ) {
    const title = cleanCalendarTitle(text);

    return baseResult(
      "calendar",
      title || text,
      null,
      resolvedDate,
      time
    );
  }

  if (/^(acheter|prendre|racheter|commander)\b/i.test(normalized)) {
    const title = clean(
      text
        .replace(/^(acheter|prendre|racheter|commander)\s+/i, "")
        .replace(/^(du|de la|de l'|des)\s*/i, "")
        .replace(/\s+\bdemain\b.*$/i, "")
    );

    return baseResult("shopping", title || text, null, resolvedDate, time);
  }

  if (/^(nettoyer|ranger|laver|aspirer|repasser|sortir)\b/i.test(normalized)) {
    const title = clean(text.replace(/\s+\bdemain\b[\s.!?,;:]*$/i, ""));
    return baseResult("task", title || text, null, resolvedDate, time);
  }

  return baseResult("unknown", text, null, resolvedDate, time);
}

export function buildHouseholdInboxHref(
  interpretation: HouseholdInboxInterpretation
): string | null {
  const {
    destination,
    title,
    financeKind,
    date,
    time,
    amount,
    recurrence,
  } = interpretation;

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
    if (amount) params.set("amount", amount);
    if (recurrence) params.set("recurrence", recurrence);

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
  return parseCivilDate(value) ? value : "";
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
  amount?: string;
  recurrence?: HouseholdInboxFinanceRecurrence;
};

function safeInboxAmount(value: string | null): string {
  if (!value || !/^\d+(?:\.\d{1,2})?$/.test(value)) return "";

  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? value : "";
}

function safeInboxFinanceRecurrence(
  value: string | null
): HouseholdInboxFinanceRecurrence {
  return value === "monthly" || value === "yearly" ? value : null;
}

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

  const result: FinanceInboxPrefill = {
    kind,
    label,
    date: safeInboxCivilDate(params.get("date")),
  };

  if (params.has("amount")) {
    result.amount = safeInboxAmount(params.get("amount"));
  }

  if (params.has("recurrence")) {
    result.recurrence = safeInboxFinanceRecurrence(params.get("recurrence"));
  }

  return result;
}



