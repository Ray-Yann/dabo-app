import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const nav = fs.readFileSync("components/DaboMainNav.tsx", "utf8");
const household = fs.readFileSync("lib/household-context.tsx", "utf8");

test("Navigation Persistence V1.1 stabilise le client Supabase partagé", () => {
  assert.match(household, /const \[supabase\] = useState\(\(\) => createClient\(\)\)/);
  assert.doesNotMatch(household, /const supabase = createClient\(\)/);
});

test("Navigation Persistence V1.1 protège un ordre local contre une lecture tardive et attend sa sauvegarde", () => {
  assert.match(nav, /const localEditRef = useRef\(false\)/);
  assert.match(nav, /&& !localEditRef\.current\) setPinned\(tabs\)/);
  assert.match(nav, /localEditRef\.current = true;\s*setPinned\(next\)/);
  assert.match(nav, /async function finishEditing\(\)[\s\S]*await saveQueueRef\.current/);
  assert.match(nav, /onClick=\{\(\)=>void finishEditing\(\)\}/);
});
