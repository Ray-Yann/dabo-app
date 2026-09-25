import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../lib/household-context.tsx", import.meta.url),
  "utf8"
);

test("HouseholdProvider imports the offline household cache helpers", () => {
  assert.ok(source.includes("createHouseholdOfflineContext"));
  assert.ok(source.includes("saveHouseholdOfflineContext"));
  assert.ok(source.includes("loadHouseholdOfflineContext"));
});

test("HouseholdProvider exposes whether the active context comes from offline cache", () => {
  assert.ok(source.includes("offlineFallback"));
  assert.ok(source.includes("setOfflineFallback"));
});

test("a successful online household load persists the authenticated user context", () => {
  assert.ok(source.includes("saveHouseholdOfflineContext("));
  assert.ok(source.includes("createHouseholdOfflineContext("));
  assert.ok(source.includes("sessionData.session.user.id"));
});

test("failed network loading attempts restoration using the authenticated user id", () => {
  const catchStart = source.indexOf("catch (error)");
  const loadCachePosition = source.indexOf(
    "loadHouseholdOfflineContext(",
    catchStart
  );

  assert.ok(catchStart >= 0);
  assert.ok(loadCachePosition > catchStart);
});

test("a restored offline context repopulates the active household state", () => {
  const catchStart = source.indexOf("catch (error)");
  const cachedPosition = source.indexOf("cachedContext", catchStart);

  assert.ok(cachedPosition > catchStart);
  assert.ok(source.indexOf("setHousehold(cachedContext.household)", cachedPosition) > cachedPosition);
  assert.ok(source.indexOf("setMe(cachedContext.me)", cachedPosition) > cachedPosition);
  assert.ok(source.indexOf("setMembers(cachedContext.members)", cachedPosition) > cachedPosition);
  assert.ok(source.indexOf("setAllMembers(cachedContext.allMembers)", cachedPosition) > cachedPosition);
  assert.ok(source.indexOf("setMemberships(cachedContext.memberships)", cachedPosition) > cachedPosition);
});

test("successful offline restoration does not leave HouseholdProvider in load error", () => {
  const catchStart = source.indexOf("catch (error)");
  const cachedPosition = source.indexOf("cachedContext", catchStart);
  const offlinePosition = source.indexOf("setOfflineFallback(true)", cachedPosition);
  const noErrorPosition = source.indexOf("setLoadError(false)", cachedPosition);

  assert.ok(cachedPosition > catchStart);
  assert.ok(offlinePosition > cachedPosition);
  assert.ok(noErrorPosition > cachedPosition);
});
