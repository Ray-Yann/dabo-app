"use client";

import { createClient } from "@/lib/supabase-client";

const VISITOR_KEY = "dabo_visitor_id_v1";
const REFERRAL_KEY = "dabo_referral_v1";
const QUEUE_KEY = "dabo_acquisition_queue_v1";

export type AcquisitionEventName =
  | "landing_view"
  | "app_open"
  | "signup_completed"
  | "household_created"
  | "household_joined"
  | "first_value";

type QueuedEvent = {
  eventName: AcquisitionEventName;
  visitorId: string;
  referralToken: string | null;
  householdId: string | null;
  valueType: "task" | "shopping" | "calendar" | null;
};

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

function readQueue(): QueuedEvent[] {
  try { return JSON.parse(window.localStorage.getItem(QUEUE_KEY) || "[]") as QueuedEvent[]; }
  catch { return []; }
}
function writeQueue(queue: QueuedEvent[]) {
  try { window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-50))); } catch { /* mesure best effort */ }
}

async function sendEvent(event: QueuedEvent) {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  return fetch("/api/acquisition-event", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(event),
    keepalive: true,
  });
}

async function flushQueue() {
  const pending = readQueue();
  if (!pending.length) return;
  const remaining: QueuedEvent[] = [];
  for (const event of pending) {
    try {
      const response = await sendEvent(event);
      if (!response.ok) remaining.push(event);
    } catch { remaining.push(event); }
  }
  writeQueue(remaining);
}

export async function trackAcquisitionEvent(
  eventName: AcquisitionEventName,
  options: { householdId?: string | null; valueType?: "task" | "shopping" | "calendar" } = {},
) {
  try {
    const visitorId = getVisitorId();
    if (!visitorId) return;
    await flushQueue();
    const event: QueuedEvent = {
      eventName,
      visitorId,
      referralToken: getReferralToken(),
      householdId: options.householdId || null,
      valueType: options.valueType || null,
    };
    const response = await sendEvent(event);
    if (!response.ok) writeQueue([...readQueue(), event]);
  } catch {
    const visitorId = getVisitorId();
    if (visitorId) writeQueue([...readQueue(), {
      eventName,
      visitorId,
      referralToken: getReferralToken(),
      householdId: options.householdId || null,
      valueType: options.valueType || null,
    }]);
  }
}
