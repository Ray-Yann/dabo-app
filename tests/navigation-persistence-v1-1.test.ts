import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs";
const household=fs.readFileSync("lib/household-context.tsx","utf8"); const nav=fs.readFileSync("components/DaboMainNav.tsx","utf8");
test("Navigation V2 conserve le client Supabase partagé stable",()=>{assert.match(household,/const \[supabase\] = useState\(\(\) => createClient\(\)\)/);});
test("Navigation V2 fixe l'architecture validée plutôt que de la recharger",()=>{assert.match(nav,/key: "planning"/);assert.match(nav,/key: "household"/);assert.doesNotMatch(nav,/setPinned/);});
