import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("app/app/page.tsx", "utf8");
const card = fs.readFileSync("components/dabo/AttentionCard.tsx", "utf8");

test("Home V1.3 met uniquement la première attention au premier plan", () => {
  assert.match(page, /attentionItems\.map\(\(attention, index\)/);
  assert.match(page, /primary=\{index === 0\}/);
});

test("AttentionCard V1.3 conserve sa densité compacte hors priorité", () => {
  assert.match(card, /primary\?: boolean/);
  assert.match(card, /primary = false/);
  assert.match(card, /primary \? "(?:dabo-organic-card )?px-4 py-4[^"]*" : "px-3 py-3/);
});

test("AttentionCard V1.3 renforce subtilement la priorité sans nouveau bloc", () => {
  assert.match(card, /primary \? "h-10 w-10" : "h-8 w-8"/);
  assert.match(card, /primary \? "text-\[15px\]" : "text-\[13px\]"/);
  assert.doesNotMatch(page, /today_primary_attention/);
});
