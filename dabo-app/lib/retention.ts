export type RetentionEvent = {
  event_name: string;
  visitor_id: string;
  user_id?: string | null;
  created_at: string;
};

export type RetentionMetric = {
  day: number;
  rate: number;
  eligible: number;
  retained: number;
  sufficient: boolean;
};

export type RetentionCohort = {
  date: string;
  signups: number;
  j1: RetentionMetric;
  j7: RetentionMetric;
  j30: RetentionMetric;
};

const DAY_MS = 86400000;
export const RETENTION_MIN_SAMPLE = 5;

const identity = (event: RetentionEvent) =>
  event.user_id ? `user:${event.user_id}` : `visitor:${event.visitor_id}`;

const sameIdentity = (signup: RetentionEvent, open: RetentionEvent) =>
  (Boolean(signup.user_id) && signup.user_id === open.user_id) || signup.visitor_id === open.visitor_id;

function metricFor(signups: RetentionEvent[], opens: RetentionEvent[], day: number, nowMs: number): RetentionMetric {
  const eligible = signups.filter(s => nowMs - new Date(s.created_at).getTime() >= day * DAY_MS);
  const retained = eligible.filter(signup => {
    const start = new Date(signup.created_at).getTime() + day * DAY_MS;
    const end = start + DAY_MS;
    return opens.some(open => sameIdentity(signup, open) && new Date(open.created_at).getTime() >= start && new Date(open.created_at).getTime() < end);
  }).length;
  return {
    day,
    rate: eligible.length ? Math.round((retained / eligible.length) * 100) : 0,
    eligible: eligible.length,
    retained,
    sufficient: eligible.length >= RETENTION_MIN_SAMPLE,
  };
}

export function calculateRetention(events: RetentionEvent[], nowMs = Date.now()) {
  // Une seule entrée de cohorte par identité : la première inscription mesurée.
  const firstSignup = new Map<string, RetentionEvent>();
  for (const event of events.filter(e => e.event_name === "signup_completed")) {
    const key = identity(event);
    const previous = firstSignup.get(key);
    if (!previous || event.created_at < previous.created_at) firstSignup.set(key, event);
  }
  const signups = [...firstSignup.values()];
  const opens = events.filter(e => e.event_name === "app_open");
  const metric = (day: number) => metricFor(signups, opens, day, nowMs);

  const byDate = new Map<string, RetentionEvent[]>();
  for (const signup of signups) {
    const date = signup.created_at.slice(0, 10);
    byDate.set(date, [...(byDate.get(date) || []), signup]);
  }
  const cohorts: RetentionCohort[] = [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 12)
    .map(([date, cohortSignups]) => ({
      date,
      signups: cohortSignups.length,
      j1: metricFor(cohortSignups, opens, 1, nowMs),
      j7: metricFor(cohortSignups, opens, 7, nowMs),
      j30: metricFor(cohortSignups, opens, 30, nowMs),
    }));

  return { j1: metric(1), j7: metric(7), j30: metric(30), cohorts, measuredSignups: signups.length };
}
