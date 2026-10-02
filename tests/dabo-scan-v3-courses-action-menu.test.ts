import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const coursesSource = fs.readFileSync("app/app/courses/page.tsx", "utf8");

test("Courses uses the primary Add action to open the shopping action chooser", () => {
  assert.ok(
    coursesSource.includes("const [showAddChoice, setShowAddChoice] = useState(false);"),
  );
  assert.ok(
    coursesSource.includes("onClick={() => setShowAddChoice(true)}"),
  );
});

test("Courses action chooser offers manual entry and receipt scanning", () => {
  assert.ok(coursesSource.includes('t("courses_add_manual")'));
  assert.ok(coursesSource.includes('t("courses_scan_receipt")'));

  assert.ok(
    coursesSource.includes(`setShowAddChoice(false);
                  setEditingId(null);
                  setShowAdd(true);`),
  );

  assert.ok(
    coursesSource.includes(`setShowAddChoice(false);
                    setShowScanV3(true);`),
  );
});

test("Courses no longer exposes receipt scanning as a secondary header link", () => {
  assert.doesNotMatch(
    coursesSource,
    /className="text-xs font-medium text-muted underline-offset-4[sS]{0,200}courses_scan_receipt/,
  );
});

test("Courses action chooser is implemented as an accessible mobile bottom sheet", () => {
  assert.ok(coursesSource.includes('role="dialog"'));
  assert.ok(coursesSource.includes('aria-modal="true"'));
  assert.ok(coursesSource.includes('t("courses_add_choice_title")'));
  assert.ok(coursesSource.includes('aria-haspopup="dialog"'));
});
