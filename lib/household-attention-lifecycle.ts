import type { AttentionCandidate } from "@/lib/attention-engine";

export type HouseholdAttentionReceipt = {
  signal_key: string;
  fingerprint: string;
  viewed_at: string;
  snoozed_until: string;
};

export const HOUSEHOLD_SIGNAL_COOLDOWN_DAYS = 3;

export function householdAttentionFingerprint(candidate: AttentionCandidate): string {
  const metadata = candidate.metadata ?? {};
  return [
    candidate.type,
    metadata.currentCount ?? "",
    metadata.previousCount ?? "",
    metadata.currentHighestShare ?? "",
    metadata.previousHighestShare ?? "",
  ].join(":");
}

export function applyHouseholdSignalLifecycle(input: {
  candidate: AttentionCandidate | null;
  receipt: HouseholdAttentionReceipt | null;
  now: string;
}): AttentionCandidate | null {
  const { candidate, receipt, now } = input;
  if (!candidate) return null;
  if (!receipt || receipt.signal_key !== candidate.dedupeKey) return candidate;

  const fingerprint = householdAttentionFingerprint(candidate);
  if (receipt.fingerprint !== fingerprint) return candidate;

  if (new Date(receipt.snoozed_until).getTime() > new Date(now).getTime()) {
    return { ...candidate, state: "snoozed", snoozedUntil: receipt.snoozed_until };
  }

  return candidate;
}

export function householdSignalSnoozedUntil(viewedAt: string): string {
  const date = new Date(viewedAt);
  date.setUTCDate(date.getUTCDate() + HOUSEHOLD_SIGNAL_COOLDOWN_DAYS);
  return date.toISOString();
}
