export function minutesSinceMidnight(hhmm: string) {
  const [hour, minute] = hhmm.split(":").map(Number);
  return hour * 60 + minute;
}

export function isWithinReminderWindow(
  localTime: string,
  eventTime: string,
  windowMinutes = 5
) {
  const elapsed =
    minutesSinceMidnight(localTime) -
    minutesSinceMidnight(eventTime);

  return elapsed >= 0 && elapsed <= windowMinutes;
}
