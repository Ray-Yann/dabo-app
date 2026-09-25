import type { ShoppingItem } from "./types";

export type ShoppingOfflineSnapshot = {
  householdId: string;
  syncedAt: string;
  items: ShoppingItem[];
};

export type ShoppingOfflineStatusChange = {
  itemId: string;
  householdId: string;
  status: ShoppingItem["status"];
  changedAt: string;
};

export function createShoppingOfflineSnapshot(
  householdId: string,
  items: ShoppingItem[],
  syncedAt: string
): ShoppingOfflineSnapshot {
  return {
    householdId,
    syncedAt,
    items,
  };
}

export function applyOfflineShoppingStatus(
  items: ShoppingItem[],
  itemId: string,
  status: ShoppingItem["status"],
  changedAt: string
): ShoppingItem[] {
  return items.map((item) => {
    if (item.id !== itemId) return item;

    return {
      ...item,
      status,
      bought_at: status === "bought" ? changedAt : null,
    };
  });
}

export function queueShoppingStatusChange(
  queue: ShoppingOfflineStatusChange[],
  change: ShoppingOfflineStatusChange
): ShoppingOfflineStatusChange[] {
  return [
    ...queue.filter(
      (pending) =>
        pending.itemId !== change.itemId ||
        pending.householdId !== change.householdId
    ),
    change,
  ];
}


export function shoppingOfflineSnapshotKey(householdId: string): string {
  return `dabo-shopping-offline:snapshot:${householdId}`;
}

export function shoppingOfflineQueueKey(householdId: string): string {
  return `dabo-shopping-offline:queue:${householdId}`;
}

export function parseShoppingOfflineSnapshot(
  raw: string | null,
  householdId: string
): ShoppingOfflineSnapshot | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("householdId" in parsed) ||
      !("syncedAt" in parsed) ||
      !("items" in parsed)
    ) {
      return null;
    }

    const snapshot = parsed as Partial<ShoppingOfflineSnapshot>;

    if (
      snapshot.householdId !== householdId ||
      typeof snapshot.syncedAt !== "string" ||
      !Array.isArray(snapshot.items)
    ) {
      return null;
    }

    return snapshot as ShoppingOfflineSnapshot;
  } catch {
    return null;
  }
}

export function parseShoppingOfflineQueue(
  raw: string | null,
  householdId: string
): ShoppingOfflineStatusChange[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (change): change is ShoppingOfflineStatusChange =>
        !!change &&
        typeof change === "object" &&
        "itemId" in change &&
        "householdId" in change &&
        "status" in change &&
        "changedAt" in change &&
        typeof change.itemId === "string" &&
        change.householdId === householdId &&
        (change.status === "to_buy" || change.status === "bought") &&
        typeof change.changedAt === "string"
    );
  } catch {
    return [];
  }
}


export function removeSyncedShoppingStatusChange(
  queue: ShoppingOfflineStatusChange[],
  householdId: string,
  itemId: string
): ShoppingOfflineStatusChange[] {
  return queue.filter(
    (change) =>
      change.householdId !== householdId ||
      change.itemId !== itemId
  );
}

export function mergePendingShoppingChanges(
  items: ShoppingItem[],
  queue: ShoppingOfflineStatusChange[],
  householdId: string
): ShoppingItem[] {
  const householdQueue = queue.filter(
    (change) => change.householdId === householdId
  );

  return householdQueue.reduce(
    (currentItems, change) =>
      applyOfflineShoppingStatus(
        currentItems,
        change.itemId,
        change.status,
        change.changedAt
      ),
    items
  );
}
