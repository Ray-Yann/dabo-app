import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const page = fs.readFileSync("app/app/page.tsx", "utf8");
const i18n = fs.readFileSync("lib/i18n.ts", "utf8");

test("Maison Vivante V3.1 limits initial attention and task rows together", () => {
  assert.match(page, /attentionItems\.slice\(0, 4\)/);
  assert.match(page, /Math\.max\(0, 4 - displayedAttention\.length\)/);
  assert.match(page, /!attentionTaskIds\.has\(task\.id\)/);
});
test("Maison Vivante V3.1 preserves an accessible opt-in expansion", () => {
  assert.match(page, /aria-expanded=\{showAllAttention\}/);
  assert.match(page, /attentionItems\.length > visibleAttention\.length/);
  assert.match(page, /showAllAttention \? attentionItems : visibleAttention/);
});
test("Maison Vivante V3.1 does not pretend an insight is a calendar event", () => {
  const section = page.split("{preparingInsight &&")[1]?.split("dabo-v3-balance")[0] ?? "";
  assert.doesNotMatch(section, /router\.push\("\/app\/calendrier"\)/);
  assert.match(section, /dabo-v3-insight/);
});
test("Maison Vivante V3.1 has all seven localized expansion labels", () => {
  assert.equal((i18n.match(/today_v3_more_attention:/g) ?? []).length, 7);
  assert.equal((i18n.match(/today_v3_less_attention:/g) ?? []).length, 7);
});
