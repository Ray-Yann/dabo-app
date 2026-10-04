import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs";
const page=fs.readFileSync("app/app/page.tsx","utf8");
test("Home V2 retire la grille statistique permanente",()=>{assert.doesNotMatch(page,/data-testid="household-quick-view"/);assert.match(page,/dabo-today-v2/);});
test("Home V2 conserve les sources métier de l'Attention Engine",()=>{assert.match(page,/taskAttentionCandidates/);assert.match(page,/shoppingItemAttentionCandidates/);assert.match(page,/financeBillAttentionCandidates/);});
test("Home V2 conserve le comptage Courses foyer pour l'intelligence",()=>{assert.match(page,/activeHouseholdShoppingCount/);});
