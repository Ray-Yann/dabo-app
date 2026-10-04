import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs";
const nav=fs.readFileSync("components/DaboMainNav.tsx","utf8");
test("Navigation V2 n'est plus dépendante d'une préférence d'onglets obsolète",()=>{assert.doesNotMatch(nav,/user_navigation_preferences/);assert.doesNotMatch(nav,/pinned_tabs/);assert.match(nav,/grid-cols-5/);});
