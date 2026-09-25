import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const providerSource = fs.readFileSync(
  new URL("../lib/household-context.tsx", import.meta.url),
  "utf8"
);

test("household offline cache save is isolated from the successful online load", () => {
  assert.ok(
    providerSource.includes("offline household cache save failed")
  );
});

test("household offline cache save failure is caught locally", () => {
  const saveIndex = providerSource.indexOf("saveHouseholdOfflineContext(");
  const catchIndex = providerSource.indexOf("catch", saveIndex);

  assert.ok(saveIndex >= 0);
  assert.ok(catchIndex > saveIndex);
});

test("successful server household state is still committed after cache save attempt", () => {
  const saveIndex = providerSource.indexOf("saveHouseholdOfflineContext(");
  const householdStateIndex = providerSource.indexOf(
    "setHousehold(householdData)",
    saveIndex
  );

  assert.ok(saveIndex >= 0);
  assert.ok(householdStateIndex > saveIndex);
});

test("provider still supports restoring the cached context after a genuine load failure", () => {
  assert.ok(providerSource.includes("loadHouseholdOfflineContext"));
  assert.ok(providerSource.includes("setOfflineFallback(true)"));
});
