import test from "node:test";
import assert from "node:assert/strict";

import { computeActivationFunnel } from "../lib/activation-funnel";

test("Activation P1.1 reste vide sans inscription", () => {
  const result = computeActivationFunnel([]);

  assert.equal(result.eligibleVisitors, 0);
  assert.equal(result.activatedVisitors, 0);
  assert.equal(result.activatedWithin5Minutes, 0);
  assert.equal(result.activationRate, 0);
  assert.equal(result.activationWithin5MinutesRate, 0);
  assert.equal(result.medianActivationSeconds, null);
});

test("Activation P1.1 mesure une première valeur atteinte en moins de cinq minutes", () => {
  const result = computeActivationFunnel([
    {
      event_name: "signup_completed",
      visitor_id: "visitor-a",
      created_at: "2026-09-21T08:00:00.000Z",
    },
    {
      event_name: "first_value",
      visitor_id: "visitor-a",
      created_at: "2026-09-21T08:04:30.000Z",
    },
  ]);

  assert.equal(result.eligibleVisitors, 1);
  assert.equal(result.activatedVisitors, 1);
  assert.equal(result.activatedWithin5Minutes, 1);
  assert.equal(result.activationRate, 100);
  assert.equal(result.activationWithin5MinutesRate, 100);
  assert.equal(result.medianActivationSeconds, 270);
});

test("Activation P1.1 inclut exactement la frontière des cinq minutes", () => {
  const result = computeActivationFunnel([
    {
      event_name: "signup_completed",
      visitor_id: "visitor-a",
      created_at: "2026-09-21T08:00:00.000Z",
    },
    {
      event_name: "first_value",
      visitor_id: "visitor-a",
      created_at: "2026-09-21T08:05:00.000Z",
    },
  ]);

  assert.equal(result.activatedWithin5Minutes, 1);
  assert.equal(result.medianActivationSeconds, 300);
});

test("Activation P1.1 distingue une activation tardive", () => {
  const result = computeActivationFunnel([
    {
      event_name: "signup_completed",
      visitor_id: "visitor-a",
      created_at: "2026-09-21T08:00:00.000Z",
    },
    {
      event_name: "first_value",
      visitor_id: "visitor-a",
      created_at: "2026-09-21T08:08:00.000Z",
    },
  ]);

  assert.equal(result.activatedVisitors, 1);
  assert.equal(result.activatedWithin5Minutes, 0);
  assert.equal(result.activationRate, 100);
  assert.equal(result.activationWithin5MinutesRate, 0);
  assert.equal(result.medianActivationSeconds, 480);
});

test("Activation P1.1 ignore une première valeur antérieure à l'inscription", () => {
  const result = computeActivationFunnel([
    {
      event_name: "first_value",
      visitor_id: "visitor-a",
      created_at: "2026-09-21T07:59:00.000Z",
    },
    {
      event_name: "signup_completed",
      visitor_id: "visitor-a",
      created_at: "2026-09-21T08:00:00.000Z",
    },
  ]);

  assert.equal(result.eligibleVisitors, 1);
  assert.equal(result.activatedVisitors, 0);
  assert.equal(result.medianActivationSeconds, null);
});

test("Activation P1.1 calcule les taux sur les visiteurs inscrits uniques", () => {
  const result = computeActivationFunnel([
    {
      event_name: "signup_completed",
      visitor_id: "visitor-a",
      created_at: "2026-09-21T08:00:00.000Z",
    },
    {
      event_name: "signup_completed",
      visitor_id: "visitor-a",
      created_at: "2026-09-21T08:00:10.000Z",
    },
    {
      event_name: "first_value",
      visitor_id: "visitor-a",
      created_at: "2026-09-21T08:02:00.000Z",
    },
    {
      event_name: "signup_completed",
      visitor_id: "visitor-b",
      created_at: "2026-09-21T09:00:00.000Z",
    },
  ]);

  assert.equal(result.eligibleVisitors, 2);
  assert.equal(result.activatedVisitors, 1);
  assert.equal(result.activatedWithin5Minutes, 1);
  assert.equal(result.activationRate, 50);
  assert.equal(result.activationWithin5MinutesRate, 50);
});

test("Activation P1.1 calcule la médiane sans laisser les activations lentes la fausser", () => {
  const result = computeActivationFunnel([
    {
      event_name: "signup_completed",
      visitor_id: "visitor-a",
      created_at: "2026-09-21T08:00:00.000Z",
    },
    {
      event_name: "first_value",
      visitor_id: "visitor-a",
      created_at: "2026-09-21T08:01:00.000Z",
    },
    {
      event_name: "signup_completed",
      visitor_id: "visitor-b",
      created_at: "2026-09-21T09:00:00.000Z",
    },
    {
      event_name: "first_value",
      visitor_id: "visitor-b",
      created_at: "2026-09-21T09:03:00.000Z",
    },
    {
      event_name: "signup_completed",
      visitor_id: "visitor-c",
      created_at: "2026-09-21T10:00:00.000Z",
    },
    {
      event_name: "first_value",
      visitor_id: "visitor-c",
      created_at: "2026-09-21T10:10:00.000Z",
    },
  ]);

  assert.equal(result.eligibleVisitors, 3);
  assert.equal(result.activatedVisitors, 3);
  assert.equal(result.activatedWithin5Minutes, 2);
  assert.equal(result.activationWithin5MinutesRate, 67);
  assert.equal(result.medianActivationSeconds, 180);
});

test("Activation P1.1 construit un funnel séquentiel inscription foyer première valeur", () => {
  const result = computeActivationFunnel([
    { event_name: "signup_completed", visitor_id: "visitor-a", created_at: "2026-09-21T08:00:00.000Z" },
    { event_name: "household_created", visitor_id: "visitor-a", created_at: "2026-09-21T08:01:00.000Z" },
    { event_name: "first_value", visitor_id: "visitor-a", created_at: "2026-09-21T08:03:00.000Z" },

    { event_name: "signup_completed", visitor_id: "visitor-b", created_at: "2026-09-21T09:00:00.000Z" },
    { event_name: "household_joined", visitor_id: "visitor-b", created_at: "2026-09-21T09:02:00.000Z" },

    { event_name: "signup_completed", visitor_id: "visitor-c", created_at: "2026-09-21T10:00:00.000Z" },
  ]);

  assert.equal(result.eligibleVisitors, 3);
  assert.equal(result.householdReachedVisitors, 2);
  assert.equal(result.funnelActivatedVisitors, 1);
  assert.equal(result.signupToHouseholdRate, 67);
  assert.equal(result.householdToFirstValueRate, 50);
});

test("Activation P1.1 refuse les étapes du funnel arrivées dans le mauvais ordre", () => {
  const result = computeActivationFunnel([
    { event_name: "household_created", visitor_id: "visitor-a", created_at: "2026-09-21T07:59:00.000Z" },
    { event_name: "signup_completed", visitor_id: "visitor-a", created_at: "2026-09-21T08:00:00.000Z" },
    { event_name: "first_value", visitor_id: "visitor-a", created_at: "2026-09-21T08:01:00.000Z" },

    { event_name: "signup_completed", visitor_id: "visitor-b", created_at: "2026-09-21T09:00:00.000Z" },
    { event_name: "first_value", visitor_id: "visitor-b", created_at: "2026-09-21T09:01:00.000Z" },
    { event_name: "household_joined", visitor_id: "visitor-b", created_at: "2026-09-21T09:02:00.000Z" },
  ]);

  assert.equal(result.householdReachedVisitors, 1);
  assert.equal(result.funnelActivatedVisitors, 0);
  assert.equal(result.signupToHouseholdRate, 50);
  assert.equal(result.householdToFirstValueRate, 0);
});
