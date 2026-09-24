import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync(
  new URL("../app/api/send-notification/route.ts", import.meta.url),
  "utf8"
);

const migration = fs.readFileSync(
  new URL("../supabase/migrations/2026-09-24-event-notification-deliveries.sql", import.meta.url),
  "utf8"
);

test("Event delivery table deduplicates by event and recipient", () => {
  assert.match(
    migration,
    /unique\s*\(event_key,\s*member_id\)/i
  );
});

test("Event delivery technical table has RLS enabled", () => {
  assert.match(
    migration,
    /alter table public\.event_notification_deliveries enable row level security/i
  );
});

test("Event delivery table grants only required write operations to service role", () => {
  assert.match(
    migration,
    /grant insert, delete\s+on table public\.event_notification_deliveries\s+to service_role/i
  );
  assert.doesNotMatch(migration, /grant all/i);
});

test("Bill Paid claims the recipient before attempting the push", () => {
  const claimIndex = route.indexOf('.from("event_notification_deliveries")');
  const pushIndex = route.indexOf("await webpush.sendNotification");

  assert.ok(claimIndex >= 0);
  assert.ok(pushIndex >= 0);
  assert.ok(claimIndex < pushIndex);
});

test("Bill Paid releases an unused claim when no push was delivered", () => {
  assert.match(
    route,
    /eventDeliveryClaimed\s*&&\s*!memberDelivered\s*&&\s*eventDeliveryKey/
  );
  assert.match(
    route,
    /\.from\("event_notification_deliveries"\)[\s\S]*?\.delete\(\)[\s\S]*?\.eq\("event_key",\s*eventDeliveryKey\)[\s\S]*?\.eq\("member_id",\s*member\.id\)/
  );
});
