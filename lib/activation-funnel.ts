export type ActivationEvent = {
  event_name: string;
  visitor_id: string;
  created_at: string;
};

export type ActivationFunnel = {
  eligibleVisitors: number;
  activatedVisitors: number;
  activatedWithin5Minutes: number;
  activationRate: number;
  activationWithin5MinutesRate: number;
  medianActivationSeconds: number | null;
  householdReachedVisitors: number;
  funnelActivatedVisitors: number;
  signupToHouseholdRate: number;
  householdToFirstValueRate: number;
};

const FIVE_MINUTES_SECONDS = 5 * 60;

export function computeActivationFunnel(
  events: ActivationEvent[]
): ActivationFunnel {
  const byVisitor = new Map<string, ActivationEvent[]>();

  for (const event of events) {
    const current = byVisitor.get(event.visitor_id) ?? [];
    current.push(event);
    byVisitor.set(event.visitor_id, current);
  }

  let eligibleVisitors = 0;
  let activatedVisitors = 0;
  let activatedWithin5Minutes = 0;
  let householdReachedVisitors = 0;
  let funnelActivatedVisitors = 0;
  const activationDurations: number[] = [];

  for (const visitorEvents of byVisitor.values()) {
    const sorted = [...visitorEvents].sort(
      (a, b) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
    );

    const signup = sorted.find(
      (event) => event.event_name === "signup_completed"
    );
    if (!signup) continue;

    eligibleVisitors += 1;

    const signupAt = new Date(signup.created_at).getTime();

    const household = sorted.find(
      (event) =>
        (event.event_name === "household_created" ||
          event.event_name === "household_joined") &&
        new Date(event.created_at).getTime() >= signupAt
    );

    if (household) {
      householdReachedVisitors += 1;

      const householdAt = new Date(household.created_at).getTime();
      const funnelFirstValue = sorted.find(
        (event) =>
          event.event_name === "first_value" &&
          new Date(event.created_at).getTime() >= householdAt
      );

      if (funnelFirstValue) {
        funnelActivatedVisitors += 1;
      }
    }

    const firstValue = sorted.find(
      (event) =>
        event.event_name === "first_value" &&
        new Date(event.created_at).getTime() >= signupAt
    );

    if (!firstValue) continue;

    const firstValueAt = new Date(firstValue.created_at).getTime();
    const durationSeconds = Math.max(
      0,
      Math.round((firstValueAt - signupAt) / 1000)
    );

    activatedVisitors += 1;
    activationDurations.push(durationSeconds);

    if (durationSeconds <= FIVE_MINUTES_SECONDS) {
      activatedWithin5Minutes += 1;
    }
  }

  activationDurations.sort((a, b) => a - b);

  let medianActivationSeconds: number | null = null;

  if (activationDurations.length > 0) {
    const middle = Math.floor(activationDurations.length / 2);

    medianActivationSeconds =
      activationDurations.length % 2 === 0
        ? Math.round(
            (activationDurations[middle - 1] +
              activationDurations[middle]) /
              2
          )
        : activationDurations[middle];
  }

  const pct = (value: number, total: number) =>
    total > 0 ? Math.round((value / total) * 100) : 0;

  return {
    eligibleVisitors,
    activatedVisitors,
    activatedWithin5Minutes,
    activationRate: pct(activatedVisitors, eligibleVisitors),
    activationWithin5MinutesRate: pct(
      activatedWithin5Minutes,
      eligibleVisitors
    ),
    medianActivationSeconds,
    householdReachedVisitors,
    funnelActivatedVisitors,
    signupToHouseholdRate: pct(householdReachedVisitors, eligibleVisitors),
    householdToFirstValueRate: pct(
      funnelActivatedVisitors,
      householdReachedVisitors
    ),
  };
}
