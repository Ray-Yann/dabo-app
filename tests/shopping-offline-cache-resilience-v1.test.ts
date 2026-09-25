import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../app/app/courses/page.tsx", import.meta.url),
  "utf8"
);

test("successful server shopping load isolates offline snapshot persistence failure", () => {
  assert.ok(
    source.includes('console.error("Unable to save shopping offline snapshot", error)')
  );

  assert.ok(
    source.includes(`try {
        await saveShoppingOfflineSnapshot(`)
  );

  assert.ok(
    source.includes(`} catch (error) {
        console.error("Unable to save shopping offline snapshot", error);
      }`)
  );
});

test("server items remain the source used after snapshot persistence", () => {
  assert.ok(
    source.includes(
      "setItems(mergePendingShoppingChanges(serverItems, queue, household.id));"
    )
  );
});
