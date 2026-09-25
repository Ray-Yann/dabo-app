import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const swSource = fs.readFileSync(
  new URL("../public/sw.js", import.meta.url),
  "utf8"
);

test("service worker defines a dedicated offline cache version", () => {
  assert.ok(swSource.includes("DABO_OFFLINE_CACHE"));
});

test("service worker precaches the Courses route needed for offline shopping", () => {
  assert.ok(swSource.includes('"/app/courses"'));
});

test("service worker keeps the app entry route available for offline startup", () => {
  assert.ok(
    swSource.includes('"/app"') ||
    swSource.includes('"/"')
  );
});

test("service worker installs the offline shell into Cache Storage", () => {
  assert.ok(swSource.includes("caches"));
  assert.ok(swSource.includes(".open(DABO_OFFLINE_CACHE)"));
  assert.ok(
    swSource.includes(".addAll(") ||
    swSource.includes("cache.add(")
  );
});

test("service worker handles fetch events for offline navigation", () => {
  assert.ok(swSource.includes('addEventListener("fetch"'));
  assert.ok(swSource.includes('event.request.mode !== "navigate"'));
});

test("offline navigation has a cached fallback instead of failing silently", () => {
  assert.ok(swSource.includes("caches.match("));
});

test("service worker only handles same-origin requests for the DABO offline cache", () => {
  assert.ok(
    swSource.includes("self.location.origin") ||
    swSource.includes("url.origin")
  );
});

test("existing push notification support remains present", () => {
  assert.ok(swSource.includes('addEventListener("push"'));
  assert.ok(swSource.includes("showNotification"));
});

test("existing notification click support remains present", () => {
  assert.ok(swSource.includes('addEventListener("notificationclick"'));
  assert.ok(swSource.includes("clients.openWindow"));
});

test("service worker still supports the DABO version message used by PWA updates", () => {
  assert.ok(swSource.includes("DABO_SW_VERSION"));
  assert.ok(swSource.includes('addEventListener("message"'));
});
