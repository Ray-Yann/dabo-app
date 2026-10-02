import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const coursesPath = "app/app/courses/page.tsx";

test("Courses intègre Scan V3 comme flux explicite uniquement en ligne", () => {
  const source = fs.readFileSync(coursesPath, "utf8");

  assert.match(source, /import \{\s*DaboScanView\s*\} from "@\/components\/DaboScanView"/);
  assert.match(source, /showScanV3/);
  assert.match(source, /setShowScanV3\(true\)/);
  assert.match(source, /setShowScanV3\(false\)/);
  assert.match(source, /!offlineShoppingMode[\s\S]*setShowScanV3\(true\)/);
  assert.match(source, /<DaboScanView/);
  assert.match(source, /household=\{household\}/);
  assert.match(source, /me=\{me\}/);
  assert.match(source, /members=\{members\}/);
  assert.match(source, /supabase=\{supabase\}/);
});

test("Courses recharge les achats et le prompt Finance après un ticket Scan V3 confirmé", () => {
  const source = fs.readFileSync(coursesPath, "utf8");

  assert.match(
    source,
    /onScanV3Saved[\s\S]*await loadItems\(\)[\s\S]*loadShoppingFinancePrompt\(\)/,
  );
  assert.match(source, /onSaved=\{onScanV3Saved\}/);
});

test("Courses ne crée jamais une transaction Finance directement depuis Scan V3", () => {
  const source = fs.readFileSync(coursesPath, "utf8");

  assert.doesNotMatch(
    source,
    /onScanV3Saved[\s\S]{0,800}dabo_record_shopping_session_expense/,
  );
});
