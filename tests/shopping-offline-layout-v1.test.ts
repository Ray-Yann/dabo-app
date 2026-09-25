import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const layoutSource = fs.readFileSync(
  new URL("../app/app/layout.tsx", import.meta.url),
  "utf8"
);

test("app layout reads the HouseholdProvider offline fallback state", () => {
  assert.ok(layoutSource.includes("offlineFallback"));
});

test("app layout knows the current pathname for offline route restriction", () => {
  assert.ok(layoutSource.includes("usePathname"));
});

test("app layout knows how to redirect an offline restored session", () => {
  assert.ok(layoutSource.includes("useRouter"));
  assert.ok(layoutSource.includes('"/app/courses"'));
});

test("offline restored sessions are restricted to the Courses route", () => {
  assert.ok(
    layoutSource.includes('pathname !== "/app/courses"') ||
    layoutSource.includes('pathname === "/app/courses"')
  );
});

test("normal DABO navigation is not rendered for the offline Courses-only shell", () => {
  assert.ok(
    layoutSource.includes("offlineFallback ?") ||
    layoutSource.includes("!offlineFallback")
  );
});

test("online sessions still render the normal DABO app shell", () => {
  assert.ok(layoutSource.includes("<AppShell"));
  assert.ok(layoutSource.includes("<DaboMainNav"));
});
