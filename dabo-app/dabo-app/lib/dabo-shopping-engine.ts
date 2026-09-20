import type { ShoppingItem } from "@/lib/types";

export type ShoppingSuggestionPreference = {
  household_id: string;
  product_key: string;
  last_label: string | null;
  dismiss_count: number;
  snoozed_until: string | null;
  disabled: boolean;
  accepted_count: number;
  removed_without_purchase_count: number;
  last_suggested_at: string | null;
  last_accepted_at: string | null;
  last_dismissed_at: string | null;
};

export type ShoppingHabitCandidate = {
  productKey: string;
  label: string;
  purchaseCount: number;
  intervalsDays: number[];
  rhythmDays: number;
  consistencyRatio: number;
  lastPurchasedOn: string;
  expectedOn: string;
  suggestFrom: string;
  suggestUntil: string;
  score: number;
};

export type DaboShoppingSuggestion = ShoppingHabitCandidate & {
  reason: "recurring_purchase";
};

export type DaboShoppingEngineInput = {
  items: ShoppingItem[];
  preferences?: ShoppingSuggestionPreference[];
  today: string;
};

export const DABO_SHOPPING_RULES = {
  minPurchases: 3,
  maxConsistencyRatio: 0.4,
  recentIntervalBlend: 0.3,
  maxAnticipationDays: 2,
  minAnticipationDays: 1,
  expiryRatio: 0.5,
  minExpiryDays: 3,
} as const;

const MS_PER_DAY = 86_400_000;

function parseCivilDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid civil date: ${value}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function addCivilDays(value: string, days: number): string {
  const date = parseCivilDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function diffCivilDays(from: string, to: string): number {
  return Math.round((parseCivilDate(to).getTime() - parseCivilDate(from).getTime()) / MS_PER_DAY);
}

function isoToCivilDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid timestamp: ${value}`);
  return date.toISOString().slice(0, 10);
}

/**
 * Conservative V1 normalization: case, surrounding/internal whitespace,
 * Unicode composition and a very small plural cleanup. No synonym or category
 * guessing is performed.
 */
export function normalizeShoppingProductName(value: string): string {
  const cleaned = value
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase("fr")
    .replace(/\s+/g, " ");

  const words = cleaned.split(" ");
  const last = words[words.length - 1];
  if (last && last.length >= 6 && last.endsWith("s") && !last.endsWith("ss")) {
    words[words.length - 1] = last.slice(0, -1);
  }
  return words.join(" ");
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function estimateRhythmDays(intervals: number[]): number {
  const base = median(intervals);
  const recent = intervals[intervals.length - 1];
  return Math.max(1, Math.round(base * (1 - DABO_SHOPPING_RULES.recentIntervalBlend) + recent * DABO_SHOPPING_RULES.recentIntervalBlend));
}

function consistencyRatio(intervals: number[], rhythmDays: number): number {
  if (intervals.length === 0 || rhythmDays <= 0) return Number.POSITIVE_INFINITY;
  const min = Math.min(...intervals);
  const max = Math.max(...intervals);
  return (max - min) / rhythmDays;
}

function getPreferenceMap(preferences: ShoppingSuggestionPreference[]): Map<string, ShoppingSuggestionPreference> {
  return new Map(preferences.map((preference) => [preference.product_key, preference]));
}

export function analyzeShoppingHabits(input: DaboShoppingEngineInput): ShoppingHabitCandidate[] {
  parseCivilDate(input.today);
  const preferences = getPreferenceMap(input.preferences ?? []);

  const activeProductKeys = new Set(
    input.items
      .filter((item) => item.status === "to_buy")
      .map((item) => normalizeShoppingProductName(item.name))
  );

  const boughtGroups = new Map<string, ShoppingItem[]>();
  input.items
    .filter((item) => item.status === "bought" && item.bought_at)
    .forEach((item) => {
      const key = normalizeShoppingProductName(item.name);
      if (!key) return;
      const group = boughtGroups.get(key) ?? [];
      group.push(item);
      boughtGroups.set(key, group);
    });

  const candidates: ShoppingHabitCandidate[] = [];

  for (const [productKey, rawItems] of boughtGroups.entries()) {
    if (rawItems.length < DABO_SHOPPING_RULES.minPurchases) continue;
    if (activeProductKeys.has(productKey)) continue;

    const preference = preferences.get(productKey);
    if (preference?.disabled) continue;
    if (preference?.snoozed_until && isoToCivilDate(preference.snoozed_until) >= input.today) continue;

    const purchases = rawItems
      .map((item) => ({ item, day: isoToCivilDate(item.bought_at!) }))
      .sort((a, b) => a.day.localeCompare(b.day) || a.item.created_at.localeCompare(b.item.created_at));

    const intervals = purchases.slice(1).map((purchase, index) =>
      diffCivilDays(purchases[index].day, purchase.day)
    );

    if (intervals.some((days) => days <= 0)) continue;

    const rhythmDays = estimateRhythmDays(intervals);
    const spread = consistencyRatio(intervals, rhythmDays);
    if (spread > DABO_SHOPPING_RULES.maxConsistencyRatio) continue;

    const last = purchases[purchases.length - 1];
    const expectedOn = addCivilDays(last.day, rhythmDays);
    const anticipationDays = Math.max(
      DABO_SHOPPING_RULES.minAnticipationDays,
      Math.min(DABO_SHOPPING_RULES.maxAnticipationDays, Math.round(rhythmDays * 0.1))
    );
    const suggestFrom = addCivilDays(expectedOn, -anticipationDays);
    const expiryDays = Math.max(DABO_SHOPPING_RULES.minExpiryDays, Math.round(rhythmDays * DABO_SHOPPING_RULES.expiryRatio));
    const suggestUntil = addCivilDays(expectedOn, expiryDays);

    if (input.today < suggestFrom || input.today > suggestUntil) continue;

    const recencyDistance = Math.abs(diffCivilDays(input.today, expectedOn));
    const dataStrength = Math.min(20, (purchases.length - DABO_SHOPPING_RULES.minPurchases) * 4);
    const consistencyScore = Math.max(0, 35 - Math.round(spread * 50));
    const timingScore = Math.max(0, 35 - recencyDistance * 4);
    const preferencePenalty = Math.min(25, (preference?.dismiss_count ?? 0) * 5 + (preference?.removed_without_purchase_count ?? 0) * 3);
    const acceptanceBoost = Math.min(10, (preference?.accepted_count ?? 0) * 2);
    const score = 30 + dataStrength + consistencyScore + timingScore + acceptanceBoost - preferencePenalty;

    const latestLabel = [...purchases]
      .sort((a, b) => b.day.localeCompare(a.day) || b.item.created_at.localeCompare(a.item.created_at))[0]
      .item.name.trim();

    candidates.push({
      productKey,
      label: preference?.last_label?.trim() || latestLabel,
      purchaseCount: purchases.length,
      intervalsDays: intervals,
      rhythmDays,
      consistencyRatio: Number(spread.toFixed(3)),
      lastPurchasedOn: last.day,
      expectedOn,
      suggestFrom,
      suggestUntil,
      score,
    });
  }

  return candidates.sort(
    (a, b) => b.score - a.score || a.expectedOn.localeCompare(b.expectedOn) || a.productKey.localeCompare(b.productKey)
  );
}

export function generateShoppingSuggestions(input: DaboShoppingEngineInput): DaboShoppingSuggestion[] {
  return analyzeShoppingHabits(input).map((candidate) => ({
    ...candidate,
    reason: "recurring_purchase" as const,
  }));
}
