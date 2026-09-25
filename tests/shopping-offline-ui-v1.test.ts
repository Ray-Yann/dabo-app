import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../app/app/courses/page.tsx", import.meta.url),
  "utf8"
);

test("Courses exposes a dedicated offline-only shopping mode", () => {
  assert.ok(
    source.includes(
      "const { loading, household, me, members, supabase, offlineFallback } = useHousehold();"
    )
  );
  assert.ok(
    source.includes(
      "const offlineShoppingMode = !isOnline || offlineFallback;"
    )
  );
});

test("offline Courses shows a clear connection status", () => {
  assert.ok(source.includes('t("courses_offline_status")'));
});

test("active reconnection synchronization is visible", () => {
  assert.ok(source.includes('t("courses_offline_syncing")'));
});

test("pending offline changes are visibly announced", () => {
  assert.ok(source.includes('t("courses_offline_pending")'));
  assert.ok(source.includes("pendingOfflineChanges"));
});

test("offline without a synchronized snapshot has a dedicated unavailable state", () => {
  assert.ok(source.includes('t("courses_offline_unavailable_title")'));
  assert.ok(source.includes('t("courses_offline_unavailable_text")'));
  assert.ok(source.includes("!hasCurrentOfflineSnapshot"));
});

test("offline mode derives the useful shopping list view without mutating React state", () => {
  assert.ok(
    source.includes(
      'const effectiveView = offlineShoppingMode ? "to_buy" : view;'
    )
  );
  assert.ok(
    !source.includes('offlineShoppingMode && view !== "to_buy"')
  );
});

test("online-only Courses controls are hidden while offline", () => {
  assert.ok(source.includes("!offlineShoppingMode && ("));
});

test("shopping item check action remains available in offline mode", () => {
  assert.ok(source.includes("onClick={() => toggle(item)}"));
});

test("offline mode does not render nearby stores", () => {
  assert.ok(
    source.includes(
      'effectiveView === "to_buy" && !offlineShoppingMode && <NearbyStoresPanel'
    )
  );
});

