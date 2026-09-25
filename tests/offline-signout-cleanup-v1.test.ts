import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const settingsSource = fs.readFileSync(
  new URL("../app/app/reglages/page.tsx", import.meta.url),
  "utf8"
);

test("settings imports household and shopping offline cleanup helpers", () => {
  assert.ok(settingsSource.includes("clearHouseholdOfflineContext"));
  assert.ok(settingsSource.includes("clearShoppingOfflineData"));
});

test("normal sign out retrieves the authenticated session before clearing offline data", () => {
  const signOutStart = settingsSource.indexOf("async function signOut()");
  assert.ok(signOutStart >= 0);

  const getSessionPosition = settingsSource.indexOf(
    "supabase.auth.getSession()",
    signOutStart
  );

  const signOutPosition = settingsSource.indexOf(
    "supabase.auth.signOut()",
    signOutStart
  );

  assert.ok(getSessionPosition > signOutStart);
  assert.ok(signOutPosition > getSessionPosition);
});

test("normal sign out clears the authenticated user's cached household context", () => {
  const signOutStart = settingsSource.indexOf("async function signOut()");
  const clearPosition = settingsSource.indexOf(
    "clearHouseholdOfflineContext(",
    signOutStart
  );
  const signOutPosition = settingsSource.indexOf(
    "supabase.auth.signOut()",
    signOutStart
  );

  assert.ok(clearPosition > signOutStart);
  assert.ok(signOutPosition > clearPosition);
});

test("normal sign out clears the active household shopping offline data", () => {
  const signOutStart = settingsSource.indexOf("async function signOut()");
  const clearPosition = settingsSource.indexOf(
    "clearShoppingOfflineData(",
    signOutStart
  );
  const signOutPosition = settingsSource.indexOf(
    "supabase.auth.signOut()",
    signOutStart
  );

  assert.ok(clearPosition > signOutStart);
  assert.ok(signOutPosition > clearPosition);
});

test("account deletion also clears offline household and shopping data", () => {
  const deleteStart = settingsSource.indexOf("async function deleteAccount");
  assert.ok(deleteStart >= 0);

  assert.ok(
    settingsSource.indexOf(
      "clearHouseholdOfflineContext(",
      deleteStart
    ) > deleteStart
  );

  assert.ok(
    settingsSource.indexOf(
      "clearShoppingOfflineData(",
      deleteStart
    ) > deleteStart
  );
});
