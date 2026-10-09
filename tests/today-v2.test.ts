import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const page=fs.readFileSync("app/app/page.tsx","utf8");
const css=fs.readFileSync("app/globals.css","utf8");

test("Aujourd'hui V2 conserve Attention Engine mais limite le budget d'attention",()=>{
 assert.match(page,/selectHouseholdAttention\(/);
 assert.match(page,/attentionItems\.slice\(0, 4\)/);
 assert.match(page,/dabo-v3-line/);
});
test("Aujourd'hui V2 possède les états jour 1 calme et erreur",()=>{
 assert.match(page,/isBrandNew/);
 assert.match(page,/today_v2_welcome/);
 assert.match(page,/visibleAttention\.length === 0/);
 assert.match(page,/today_v2_calm_title/);
 assert.match(page,/dashboardLoadError/);
 assert.match(page,/today_v2_offline_title/);
});
test("Aujourd'hui V2 sépare l'éditorial et la préparation DABO",()=>{
 assert.match(page,/today_v2_preparing/);
 assert.match(page,/dabo-v3-insight/);
 assert.match(css,/\.dabo-v3-insight/);
 assert.match(css,/\.dabo-urgent-badge/);
});
