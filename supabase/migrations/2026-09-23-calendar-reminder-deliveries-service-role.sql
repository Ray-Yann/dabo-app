-- Calendar reminders need to persist a delivery claim before sending a push
-- and delete that claim again when no notification could be delivered.
-- service_role intentionally receives only the privileges required by
-- app/api/calendar-reminders/route.ts.

grant insert, delete
on table public.calendar_reminder_deliveries
to service_role;
