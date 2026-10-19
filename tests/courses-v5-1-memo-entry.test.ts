import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("app/app/courses/page.tsx", "utf8");

test("Courses V5.1 exposes memo in primary add chooser", () => {
  assert.match(source, /setShowAddChoice\(false\);\s*setView\("to_buy"\);\s*setEditingId\(null\);\s*setShowScanV3\(false\);\s*setShowAdd\(true\);\s*setShowBulkImport\(true\)/);
  assert.match(source, /t\("courses_bulk_import_title"\)/);
  assert.match(source, /t\("courses_bulk_import_hint"\)/);
});

test("Courses V5.1 preserves manual and receipt workflows", () => {
  assert.match(source, /setShowBulkImport\(false\);\s*setMemoPreview\(null\);\s*setBulkImportError\(""\);\s*setShowAdd\(true\)/);
  assert.match(source, /setShowScanV3\(true\)/);
  assert.match(source, /setMemoPreview\(parseShoppingMemo\(bulkImportText\)\)/);
});
