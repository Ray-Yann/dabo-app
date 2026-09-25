import type {
  ShoppingOfflineSnapshot,
  ShoppingOfflineStatusChange,
} from "./shopping-offline";
import {
  parseShoppingOfflineQueue,
  parseShoppingOfflineSnapshot,
  shoppingOfflineQueueKey,
  shoppingOfflineSnapshotKey,
} from "./shopping-offline";

const DB_NAME = "dabo-offline-v1";
const DB_VERSION = 1;
const STORE_NAME = "keyval";

function openShoppingOfflineDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Unable to open DABO offline storage"));
  });
}

async function readValue(key: string): Promise<string | null> {
  if (typeof indexedDB === "undefined") return null;

  const database = await openShoppingOfflineDatabase();

  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(key);

      request.onsuccess = () =>
        resolve(typeof request.result === "string" ? request.result : null);
      request.onerror = () =>
        reject(request.error ?? new Error("Unable to read DABO offline storage"));
    });
  } finally {
    database.close();
  }
}

async function writeValue(key: string, value: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;

  const database = await openShoppingOfflineDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");

      transaction.objectStore(STORE_NAME).put(value, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Unable to write DABO offline storage"));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("DABO offline storage transaction aborted"));
    });
  } finally {
    database.close();
  }
}

async function deleteValue(key: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;

  const database = await openShoppingOfflineDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");

      transaction.objectStore(STORE_NAME).delete(key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Unable to delete DABO offline storage"));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("DABO offline storage transaction aborted"));
    });
  } finally {
    database.close();
  }
}

export async function saveShoppingOfflineSnapshot(
  snapshot: ShoppingOfflineSnapshot
): Promise<void> {
  await writeValue(
    shoppingOfflineSnapshotKey(snapshot.householdId),
    JSON.stringify(snapshot)
  );
}

export async function loadShoppingOfflineSnapshot(
  householdId: string
): Promise<ShoppingOfflineSnapshot | null> {
  const raw = await readValue(shoppingOfflineSnapshotKey(householdId));
  return parseShoppingOfflineSnapshot(raw, householdId);
}

export async function saveShoppingOfflineQueue(
  householdId: string,
  queue: ShoppingOfflineStatusChange[]
): Promise<void> {
  await writeValue(
    shoppingOfflineQueueKey(householdId),
    JSON.stringify(queue)
  );
}

export async function loadShoppingOfflineQueue(
  householdId: string
): Promise<ShoppingOfflineStatusChange[]> {
  const raw = await readValue(shoppingOfflineQueueKey(householdId));
  return parseShoppingOfflineQueue(raw, householdId);
}

export async function clearShoppingOfflineData(
  householdId: string
): Promise<void> {
  await Promise.all([
    deleteValue(shoppingOfflineSnapshotKey(householdId)),
    deleteValue(shoppingOfflineQueueKey(householdId)),
  ]);
}
