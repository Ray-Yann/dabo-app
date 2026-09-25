import type { HouseholdOfflineContext } from "./household-offline";
import {
  householdOfflineContextKey,
  parseHouseholdOfflineContext,
} from "./household-offline";

const DB_NAME = "dabo-offline-v1";
const DB_VERSION = 1;
const STORE_NAME = "keyval";
const OFFLINE_AUTHENTICATED_USER_KEY = "dabo-offline-authenticated-user";

function openHouseholdOfflineDatabase(): Promise<IDBDatabase> {
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
      reject(
        request.error ??
          new Error("Unable to open DABO household offline storage")
      );
  });
}

async function readValue(key: string): Promise<string | null> {
  if (typeof indexedDB === "undefined") return null;

  const database = await openHouseholdOfflineDatabase();

  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(key);

      request.onsuccess = () =>
        resolve(
          typeof request.result === "string"
            ? request.result
            : null
        );

      request.onerror = () =>
        reject(
          request.error ??
            new Error("Unable to read DABO household offline storage")
        );
    });
  } finally {
    database.close();
  }
}

async function writeValue(key: string, value: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;

  const database = await openHouseholdOfflineDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");

      transaction
        .objectStore(STORE_NAME)
        .put(value, key);

      transaction.oncomplete = () => resolve();

      transaction.onerror = () =>
        reject(
          transaction.error ??
            new Error("Unable to write DABO household offline storage")
        );

      transaction.onabort = () =>
        reject(
          transaction.error ??
            new Error("DABO household offline storage transaction aborted")
        );
    });
  } finally {
    database.close();
  }
}

async function deleteValue(key: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;

  const database = await openHouseholdOfflineDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");

      transaction
        .objectStore(STORE_NAME)
        .delete(key);

      transaction.oncomplete = () => resolve();

      transaction.onerror = () =>
        reject(
          transaction.error ??
            new Error("Unable to clear DABO household offline storage")
        );

      transaction.onabort = () =>
        reject(
          transaction.error ??
            new Error("DABO household offline storage transaction aborted")
        );
    });
  } finally {
    database.close();
  }
}

export async function saveHouseholdOfflineContext(
  context: HouseholdOfflineContext
): Promise<void> {
  await writeValue(
    householdOfflineContextKey(context.userId),
    JSON.stringify(context)
  );
}

export async function loadHouseholdOfflineContext(
  userId: string
): Promise<HouseholdOfflineContext | null> {
  const raw = await readValue(
    householdOfflineContextKey(userId)
  );

  return parseHouseholdOfflineContext(raw, userId);
}

export async function clearHouseholdOfflineContext(
  userId: string
): Promise<void> {
  await deleteValue(
    householdOfflineContextKey(userId)
  );
}

export async function saveOfflineAuthenticatedUser(
  userId: string
): Promise<void> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) return;

  await writeValue(
    OFFLINE_AUTHENTICATED_USER_KEY,
    normalizedUserId
  );
}

export async function loadOfflineAuthenticatedUser(): Promise<string | null> {
  const userId = await readValue(
    OFFLINE_AUTHENTICATED_USER_KEY
  );

  return userId?.trim() || null;
}

export async function clearOfflineAuthenticatedUser(): Promise<void> {
  await deleteValue(
    OFFLINE_AUTHENTICATED_USER_KEY
  );
}
