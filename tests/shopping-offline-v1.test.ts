import assert from "node:assert/strict";
import test from "node:test";
import {
  applyOfflineShoppingStatus,
  createShoppingOfflineSnapshot,
  queueShoppingStatusChange,
  shoppingOfflineSnapshotKey,
  shoppingOfflineQueueKey,
  parseShoppingOfflineSnapshot,
  parseShoppingOfflineQueue,
  removeSyncedShoppingStatusChange,
  mergePendingShoppingChanges,
} from "../lib/shopping-offline";

const item = {
  id: "item-1",
  household_id: "household-1",
  name: "Lait",
  quantity: "2",
  assigned_to: null,
  status: "to_buy" as const,
  urgent: false,
  due_date: null,
  bought_at: null,
  created_at: "2026-09-24T18:00:00.000Z",
};

test("creates a household-scoped shopping snapshot", () => {
  const snapshot = createShoppingOfflineSnapshot("household-1", [item], "2026-09-24T20:00:00.000Z");

  assert.equal(snapshot.householdId, "household-1");
  assert.equal(snapshot.syncedAt, "2026-09-24T20:00:00.000Z");
  assert.deepEqual(snapshot.items, [item]);
});

test("applies a bought status locally while offline", () => {
  const updated = applyOfflineShoppingStatus(
    [item],
    "item-1",
    "bought",
    "2026-09-24T20:05:00.000Z"
  );

  assert.equal(updated[0].status, "bought");
  assert.equal(updated[0].bought_at, "2026-09-24T20:05:00.000Z");
});

test("restores an item to to_buy locally", () => {
  const boughtItem = {
    ...item,
    status: "bought" as const,
    bought_at: "2026-09-24T20:05:00.000Z",
  };

  const updated = applyOfflineShoppingStatus(
    [boughtItem],
    "item-1",
    "to_buy",
    "2026-09-24T20:10:00.000Z"
  );

  assert.equal(updated[0].status, "to_buy");
  assert.equal(updated[0].bought_at, null);
});

test("keeps only the latest pending status for the same item", () => {
  const firstQueue = queueShoppingStatusChange([], {
    itemId: "item-1",
    householdId: "household-1",
    status: "bought",
    changedAt: "2026-09-24T20:05:00.000Z",
  });

  const secondQueue = queueShoppingStatusChange(firstQueue, {
    itemId: "item-1",
    householdId: "household-1",
    status: "to_buy",
    changedAt: "2026-09-24T20:06:00.000Z",
  });

  assert.equal(secondQueue.length, 1);
  assert.equal(secondQueue[0].status, "to_buy");
  assert.equal(secondQueue[0].changedAt, "2026-09-24T20:06:00.000Z");
});


test("uses household-scoped persistence keys", () => {
  assert.equal(
    shoppingOfflineSnapshotKey("household-1"),
    "dabo-shopping-offline:snapshot:household-1"
  );
  assert.equal(
    shoppingOfflineQueueKey("household-1"),
    "dabo-shopping-offline:queue:household-1"
  );
});

test("restores a valid persisted shopping snapshot", () => {
  const raw = JSON.stringify(
    createShoppingOfflineSnapshot(
      "household-1",
      [item],
      "2026-09-24T20:00:00.000Z"
    )
  );

  const snapshot = parseShoppingOfflineSnapshot(raw, "household-1");

  assert.ok(snapshot);
  assert.equal(snapshot.householdId, "household-1");
  assert.equal(snapshot.items[0].name, "Lait");
});

test("rejects a snapshot belonging to another household", () => {
  const raw = JSON.stringify(
    createShoppingOfflineSnapshot(
      "household-2",
      [item],
      "2026-09-24T20:00:00.000Z"
    )
  );

  assert.equal(parseShoppingOfflineSnapshot(raw, "household-1"), null);
});

test("restores only valid pending status changes for the active household", () => {
  const raw = JSON.stringify([
    {
      itemId: "item-1",
      householdId: "household-1",
      status: "bought",
      changedAt: "2026-09-24T20:05:00.000Z",
    },
    {
      itemId: "item-2",
      householdId: "household-2",
      status: "to_buy",
      changedAt: "2026-09-24T20:06:00.000Z",
    },
  ]);

  const queue = parseShoppingOfflineQueue(raw, "household-1");

  assert.equal(queue.length, 1);
  assert.equal(queue[0].itemId, "item-1");
  assert.equal(queue[0].status, "bought");
});

test("fails safely on corrupted persisted data", () => {
  assert.equal(parseShoppingOfflineSnapshot("{broken", "household-1"), null);
  assert.deepEqual(parseShoppingOfflineQueue("{broken", "household-1"), []);
});


test("removes only the successfully synchronized change", () => {
  const queue = [
    {
      itemId: "item-1",
      householdId: "household-1",
      status: "bought" as const,
      changedAt: "2026-09-24T20:05:00.000Z",
    },
    {
      itemId: "item-2",
      householdId: "household-1",
      status: "to_buy" as const,
      changedAt: "2026-09-24T20:06:00.000Z",
    },
  ];

  const remaining = removeSyncedShoppingStatusChange(
    queue,
    "household-1",
    "item-1"
  );

  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].itemId, "item-2");
});

test("reapplies pending offline changes over a fresh server snapshot", () => {
  const serverItems = [
    item,
    {
      ...item,
      id: "item-2",
      name: "Pain",
    },
  ];

  const pending = [
    {
      itemId: "item-1",
      householdId: "household-1",
      status: "bought" as const,
      changedAt: "2026-09-24T20:05:00.000Z",
    },
  ];

  const merged = mergePendingShoppingChanges(
    serverItems,
    pending,
    "household-1"
  );

  assert.equal(merged[0].status, "bought");
  assert.equal(merged[0].bought_at, "2026-09-24T20:05:00.000Z");
  assert.equal(merged[1].status, "to_buy");
});

test("never applies pending changes from another household", () => {
  const pending = [
    {
      itemId: "item-1",
      householdId: "household-2",
      status: "bought" as const,
      changedAt: "2026-09-24T20:05:00.000Z",
    },
  ];

  const merged = mergePendingShoppingChanges(
    [item],
    pending,
    "household-1"
  );

  assert.equal(merged[0].status, "to_buy");
  assert.equal(merged[0].bought_at, null);
});
