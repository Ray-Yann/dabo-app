const fs = require("fs");
const assert = require("node:assert/strict");
const test = require("node:test");

const storageSource = fs.readFileSync("lib/household-offline-storage.ts", "utf8");
const rootSource = fs.readFileSync("app/page.tsx", "utf8");
const providerSource = fs.readFileSync("lib/household-context.tsx", "utf8");
const settingsSource = fs.readFileSync("app/app/reglages/page.tsx", "utf8");

test("offline storage exposes a remembered authenticated user identity", () => {
  assert.match(storageSource, /saveOfflineAuthenticatedUser/);
  assert.match(storageSource, /loadOfflineAuthenticatedUser/);
  assert.match(storageSource, /clearOfflineAuthenticatedUser/);
});

test("root startup can recover a remembered user when offline without a Supabase session", () => {
  assert.match(rootSource, /let startupUserId = data\.session\?\.user\.id \?\? null/);
  assert.match(rootSource, /loadOfflineAuthenticatedUser/);

  const rememberedUser = rootSource.indexOf(
    "startupUserId = await loadOfflineAuthenticatedUser()"
  );
  const noUserGuard = rootSource.indexOf("if (!startupUserId)");

  assert.ok(
    rememberedUser >= 0,
    "offline remembered-user recovery is missing"
  );
  assert.ok(
    noUserGuard > rememberedUser,
    "remembered-user recovery must happen before startup gives up on authentication"
  );
});

test("household provider can restore cached household without a live Supabase session while offline", () => {
  assert.match(providerSource, /loadOfflineAuthenticatedUser/);
  assert.match(providerSource, /loadHouseholdOfflineContext/);
});

test("successful authenticated household loading remembers the user for future offline startup", () => {
  assert.match(providerSource, /saveOfflineAuthenticatedUser/);
});

test("normal sign out clears the remembered offline authenticated user", () => {
  const signOutStart = settingsSource.indexOf("async function signOut()");
  assert.ok(signOutStart >= 0);

  const clearPosition = settingsSource.indexOf(
    "clearOfflineAuthenticatedUser(",
    signOutStart
  );
  const signOutPosition = settingsSource.indexOf(
    "supabase.auth.signOut()",
    signOutStart
  );

  assert.ok(clearPosition > signOutStart);
  assert.ok(signOutPosition > clearPosition);
});

test("account deletion clears the remembered offline authenticated user", () => {
  const deleteStart = settingsSource.indexOf("async function deleteAccount");
  assert.ok(deleteStart >= 0);

  assert.ok(
    settingsSource.indexOf(
      "clearOfflineAuthenticatedUser(",
      deleteStart
    ) > deleteStart
  );
});

test("remembered offline identity cannot fall through into authenticated Supabase queries", () => {
  const rememberedUser = rootSource.indexOf(
    "startupUserId = await loadOfflineAuthenticatedUser()"
  );
  const realSessionGuard = rootSource.indexOf(
    "if (!data.session)"
  );
  const membersQuery = rootSource.indexOf(
    '.from("members")'
  );

  assert.ok(
    rememberedUser >= 0,
    "offline remembered-user recovery is missing"
  );

  assert.ok(
    realSessionGuard > rememberedUser,
    "a real Supabase session guard must follow offline cache recovery"
  );

  assert.ok(
    membersQuery > realSessionGuard,
    "authenticated members query must stay behind the real-session guard"
  );
});
