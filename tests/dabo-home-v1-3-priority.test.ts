import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs";
const page=fs.readFileSync("app/app/page.tsx","utf8");
test("Home V2 limite l'attention visible au lieu de tout empiler",()=>{assert.match(page,/attentionItems\.slice\(0, 4\)/);assert.match(page,/displayedAttention\.map/);assert.match(page,/Math\.max\(0, 4 - displayedAttention\.length\)/);assert.match(page,/attentionItems\.length > visibleAttention\.length/);});
