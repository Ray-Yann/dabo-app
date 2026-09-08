"use client";

import { createClient } from "@/lib/supabase-client";

const VISITOR_KEY = "dabo_visitor_id_v1";
const REFERRAL_KEY = "dabo_referral_v1";

export type AcquisitionEventName =
  | "landing_view"
  | "app_open"
  | "signup_completed"
  | "household_created"
  | "household_joined"
  | "first_value";

export function getVisitorId() {
  if (typeof window === "undefined") return null;
  let id = window.localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

export function captureReferralFromUrl() {
  if (typeof window === "undefined") return null;
  const ref = new URLSearchParams(window.location.search).get("ref");
  if (ref && /^[0-9a-f-]{36}$/i.test(ref)) window.localStorage.setItem(REFERRAL_KEY, ref);
  return window.localStorage.getItem(REFERRAL_KEY);
}

export function getReferralToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFERRAL_KEY);
}

export async function trackAcquisitionEvent(
  eventName: AcquisitionEventName,
  options: { householdId?: string | null; valueType?: "task" | "shopping" | "calendar" } = {},
) {
  try {
    const visitorId = getVisitorId();
    if (!visitorId) return;
    const { data } = await createClient().auth.getSession();
    const token = data.session?.access_token;
    const response = await fetch("/api/acquisition-event", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        eventName,
        visitorId,
        referralToken: getReferralToken(),
        householdId: options.householdId || null,
        valueType: options.valueType || null,
      }),
      keepalive: true,
    });
    if (!response.ok) console.warn("[DABO acquisition] mesure indisponible");
  } catch {
    // La télémétrie ne doit jamais bloquer l'expérience DABO.
  }
}
