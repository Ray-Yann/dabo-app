import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const nav = fs.readFileSync("components/DaboMainNav.tsx", "utf8");

test("Navigation personnalisée ne recharge pas une préférence obsolète à chaque rendu", () => {
  assert.match(nav, /function isTabKey\(value: string\): value is TabKey/);
  assert.match(nav, /\}, \[me\?\.user_id, supabase\]\);/);
  assert.doesNotMatch(nav, /\[me\?\.user_id, supabase, catalog\]/);
});

test("Navigation personnalisée sérialise les sauvegardes rapides dans leur ordre", () => {
  assert.match(nav, /saveQueueRef = useRef<Promise<void>>\(Promise\.resolve\(\)\)/);
  assert.match(nav, /saveQueueRef\.current = saveQueueRef\.current/);
  assert.match(nav, /pinned_tabs: next/);
});
