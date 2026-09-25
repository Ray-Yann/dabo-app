import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../app/app/courses/page.tsx", import.meta.url),
  "utf8"
);

test("offline sync reads the queue before entering syncing state", () => {
  const fnStart = source.indexOf(
    "const syncPendingShoppingChanges = useCallback(async () => {"
  );

  assert.ok(fnStart >= 0);

  const fnEnd = source.indexOf(
    "}, [household, supabase, loadItems, loadShoppingFinancePrompt]);",
    fnStart
  );

  assert.ok(fnEnd > fnStart);

  const fn = source.slice(fnStart, fnEnd);

  const loadQueue = fn.indexOf(
    "let queue = await loadShoppingOfflineQueue(household.id);"
  );
  const syncingTrue = fn.indexOf(
    "setIsSyncingOfflineChanges(true);"
  );

  assert.ok(loadQueue >= 0);
  assert.ok(syncingTrue > loadQueue);
});

test("offline sync exits cleanly when the queue is empty", () => {
  assert.ok(
    source.includes(
      "if (queue.length === 0) return;"
    )
  );
});

test("empty queue is reflected in pending state before early return", () => {
  const queueLoad = source.indexOf(
    "let queue = await loadShoppingOfflineQueue(household.id);"
  );

  const pendingUpdate = source.indexOf(
    "setPendingOfflineChanges(queue.length);",
    queueLoad
  );

  const emptyReturn = source.indexOf(
    "if (queue.length === 0) return;",
    queueLoad
  );

  assert.ok(queueLoad >= 0);
  assert.ok(pendingUpdate > queueLoad);
  assert.ok(emptyReturn > pendingUpdate);
});
