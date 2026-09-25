import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const storage = fs.readFileSync(
  new URL("../lib/shopping-offline-storage.ts", import.meta.url),
  "utf8"
);

test("uses native IndexedDB without an external persistence dependency", () => {
  assert.match(storage, /indexedDB\.open\(/);
  assert.match(storage, /createObjectStore\(/);
});

test("persists and restores the shopping snapshot", () => {
  assert.match(storage, /export async function saveShoppingOfflineSnapshot/);
  assert.match(storage, /export async function loadShoppingOfflineSnapshot/);
  assert.match(storage, /shoppingOfflineSnapshotKey/);
  assert.match(storage, /parseShoppingOfflineSnapshot/);
});

test("persists and restores the pending synchronization queue", () => {
  assert.match(storage, /export async function saveShoppingOfflineQueue/);
  assert.match(storage, /export async function loadShoppingOfflineQueue/);
  assert.match(storage, /shoppingOfflineQueueKey/);
  assert.match(storage, /parseShoppingOfflineQueue/);
});

test("supports removing persisted offline data for one household", () => {
  assert.match(storage, /export async function clearShoppingOfflineData/);
});
