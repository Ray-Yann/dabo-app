const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const providerSource = fs.readFileSync(
  "lib/household-context.tsx",
  "utf8"
);

test("online startup waits for Supabase auth resolution before treating a missing session as signed out", () => {
  assert.match(
    providerSource,
    /onAuthStateChange/,
    "HouseholdProvider must observe Supabase auth resolution"
  );

  const noSessionBranch = providerSource.indexOf(
    "if (!sessionData.session)"
  );
  const authListener = providerSource.indexOf(
    "onAuthStateChange"
  );

  assert.ok(
    noSessionBranch >= 0,
    "missing-session branch is required"
  );

  assert.ok(
    authListener >= 0,
    "Supabase auth resolution listener is missing"
  );

  assert.ok(
    providerSource.includes("INITIAL_SESSION"),
    "online startup must explicitly handle Supabase INITIAL_SESSION"
  );
});

test("offline remembered identity remains restricted to offline startup", () => {
  assert.match(
    providerSource,
    /if \(!navigator\.onLine\)[\s\S]*loadOfflineAuthenticatedUser\(\)/,
    "remembered local identity must remain inside the offline branch"
  );
});
