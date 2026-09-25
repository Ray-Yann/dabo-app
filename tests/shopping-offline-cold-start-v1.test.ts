import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const swSource = fs.readFileSync(
  new URL("../public/sw.js", import.meta.url),
  "utf8"
);

test("service worker handles the manifest root route for offline cold startup", () => {
  assert.ok(
    swSource.includes('url.pathname === "/"') ||
    swSource.includes('"/"')
  );
});

test("offline root navigation can fall back to the cached Courses shell", () => {
  assert.ok(swSource.includes('caches.match("/app/courses")'));
});

test("service worker recognizes Next.js static assets", () => {
  assert.ok(swSource.includes("/_next/static/"));
});

test("same-origin Next.js static assets use Cache Storage", () => {
  assert.ok(swSource.includes("DABO_OFFLINE_CACHE"));
  assert.ok(swSource.includes("cache.match(event.request)"));
});

test("missing static assets are fetched and cached while online", () => {
  assert.ok(swSource.includes("fetch(event.request)"));
  assert.ok(swSource.includes("cache.put(event.request"));
});

test("offline asset caching remains limited to same-origin requests", () => {
  assert.ok(swSource.includes("url.origin !== self.location.origin"));
});

test("push notifications remain untouched", () => {
  assert.ok(swSource.includes('addEventListener("push"'));
  assert.ok(swSource.includes("showNotification"));
});

test("notification clicks remain untouched", () => {
  assert.ok(swSource.includes('addEventListener("notificationclick"'));
  assert.ok(swSource.includes("clients.openWindow"));
});
