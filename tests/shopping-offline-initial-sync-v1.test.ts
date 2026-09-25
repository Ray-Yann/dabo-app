import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../app/app/courses/page.tsx", import.meta.url),
  "utf8"
);

test("initial online queue synchronization is deferred outside the effect body", () => {
  assert.ok(
    source.includes(
      `const initialSyncTimer = navigator.onLine
      ? window.setTimeout(() => void syncPendingShoppingChanges(), 0)
      : null;`
    )
  );

  assert.ok(
    source.includes(
      `if (initialSyncTimer !== null) {
        window.clearTimeout(initialSyncTimer);
      }`
    )
  );

  assert.ok(
    !source.includes(
      `if (navigator.onLine) {
      void syncPendingShoppingChanges();
    }`
    )
  );
});

test("browser online event still triggers queued shopping synchronization", () => {
  assert.ok(
    source.includes(
      `const handleOnline = () => {
      setIsOnline(true);
      void syncPendingShoppingChanges();
    };`
    )
  );
});
