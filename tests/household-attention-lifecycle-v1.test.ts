import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  applyHouseholdSignalLifecycle,
  householdAttentionFingerprint,
  householdSignalSnoozedUntil,
} from "../lib/household-attention-lifecycle";
import { buildTodayHouseholdIntelligenceCandidate } from "../lib/today-household-intelligence";

const candidate = buildTodayHouseholdIntelligenceCandidate({
  householdId: "home-1",
  insights: {
    enoughComparisonData: true,
    trend: "watch",
    currentCount: 19,
    previousCount: 13,
    currentHighestShare: 70,
    previousHighestShare: 50,
  } as never,
});

test("Cycle repères V1 laisse apparaître un nouveau repère", () => {
  assert.ok(candidate);
  assert.equal(applyHouseholdSignalLifecycle({ candidate, receipt: null, now: "2026-09-16T12:00:00.000Z" })?.state, undefined);
});

test("Cycle repères V1 temporise un repère déjà consulté", () => {
  assert.ok(candidate);
  const fingerprint = householdAttentionFingerprint(candidate);
  const result = applyHouseholdSignalLifecycle({
    candidate,
    receipt: { signal_key: candidate.dedupeKey, fingerprint, viewed_at: "2026-09-16T12:00:00.000Z", snoozed_until: "2026-09-19T12:00:00.000Z" },
    now: "2026-09-17T12:00:00.000Z",
  });
  assert.equal(result?.state, "snoozed");
});

test("Cycle repères V1 réveille immédiatement un signal dont les données ont réellement changé", () => {
  assert.ok(candidate);
  const result = applyHouseholdSignalLifecycle({
    candidate,
    receipt: { signal_key: candidate.dedupeKey, fingerprint: "old-state", viewed_at: "2026-09-16T12:00:00.000Z", snoozed_until: "2026-09-19T12:00:00.000Z" },
    now: "2026-09-17T12:00:00.000Z",
  });
  assert.equal(result?.state, undefined);
});

test("Cycle repères V1 autorise le retour après la temporisation si le signal reste justifié", () => {
  assert.ok(candidate);
  const fingerprint = householdAttentionFingerprint(candidate);
  const result = applyHouseholdSignalLifecycle({
    candidate,
    receipt: { signal_key: candidate.dedupeKey, fingerprint, viewed_at: "2026-09-16T12:00:00.000Z", snoozed_until: "2026-09-19T12:00:00.000Z" },
    now: "2026-09-20T12:00:00.000Z",
  });
  assert.equal(result?.state, undefined);
});

test("Cycle repères V1 utilise une temporisation déterministe de trois jours", () => {
  assert.equal(householdSignalSnoozedUntil("2026-09-16T12:00:00.000Z"), "2026-09-19T12:00:00.000Z");
});

test("Cycle repères V1 persiste par utilisateur et foyer avec RLS", () => {
  const migration = readFileSync("supabase/migrations/2026-09-16-household-attention-lifecycle-v1.sql", "utf8");
  assert.match(migration, /user_id = auth\.uid\(\)/);
  assert.match(migration, /m\.household_id = household_attention_receipts\.household_id/);
  assert.match(migration, /unique \(household_id, user_id, signal_key\)/);
});

test("Cycle repères V1 mémorise la consultation au clic avant d'ouvrir le Bilan", () => {
  const page = readFileSync("app/app/page.tsx", "utf8");
  assert.match(page, /consultHouseholdIntelligence/);
  assert.match(page, /household_attention_receipts/);
  assert.match(page, /householdAttentionFingerprint\(attention\)/);
  assert.match(page, /router\.push\("\/app\/bilan"\)/);
});
