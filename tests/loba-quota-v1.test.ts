import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  getLobaDailyLimit,
  LOBA_DEFAULT_DAILY_LIMITS,
} from "../lib/loba-usage";

test("LOBA définit les quotas journaliers attendus", () => {
  assert.equal(LOBA_DEFAULT_DAILY_LIMITS.admin, 100);
  assert.equal(LOBA_DEFAULT_DAILY_LIMITS.household, 20);
});

test("LOBA utilise les quotas par défaut sans configuration", () => {
  const previousAdmin = process.env.LOBA_ADMIN_DAILY_LIMIT;
  const previousHousehold = process.env.LOBA_HOUSEHOLD_DAILY_LIMIT;

  delete process.env.LOBA_ADMIN_DAILY_LIMIT;
  delete process.env.LOBA_HOUSEHOLD_DAILY_LIMIT;

  assert.equal(getLobaDailyLimit("admin"), 100);
  assert.equal(getLobaDailyLimit("household"), 20);

  if (previousAdmin === undefined) {
    delete process.env.LOBA_ADMIN_DAILY_LIMIT;
  } else {
    process.env.LOBA_ADMIN_DAILY_LIMIT = previousAdmin;
  }

  if (previousHousehold === undefined) {
    delete process.env.LOBA_HOUSEHOLD_DAILY_LIMIT;
  } else {
    process.env.LOBA_HOUSEHOLD_DAILY_LIMIT = previousHousehold;
  }
});

test("LOBA accepte une limite positive configurée par environnement", () => {
  const previousAdmin = process.env.LOBA_ADMIN_DAILY_LIMIT;
  const previousHousehold = process.env.LOBA_HOUSEHOLD_DAILY_LIMIT;

  process.env.LOBA_ADMIN_DAILY_LIMIT = "7";
  process.env.LOBA_HOUSEHOLD_DAILY_LIMIT = "3";

  assert.equal(getLobaDailyLimit("admin"), 7);
  assert.equal(getLobaDailyLimit("household"), 3);

  if (previousAdmin === undefined) {
    delete process.env.LOBA_ADMIN_DAILY_LIMIT;
  } else {
    process.env.LOBA_ADMIN_DAILY_LIMIT = previousAdmin;
  }

  if (previousHousehold === undefined) {
    delete process.env.LOBA_HOUSEHOLD_DAILY_LIMIT;
  } else {
    process.env.LOBA_HOUSEHOLD_DAILY_LIMIT = previousHousehold;
  }
});

test("LOBA revient au quota par défaut si une limite configurée est invalide", () => {
  const previousAdmin = process.env.LOBA_ADMIN_DAILY_LIMIT;
  const previousHousehold = process.env.LOBA_HOUSEHOLD_DAILY_LIMIT;

  process.env.LOBA_ADMIN_DAILY_LIMIT = "0";
  process.env.LOBA_HOUSEHOLD_DAILY_LIMIT = "abc";

  assert.equal(getLobaDailyLimit("admin"), 100);
  assert.equal(getLobaDailyLimit("household"), 20);

  if (previousAdmin === undefined) {
    delete process.env.LOBA_ADMIN_DAILY_LIMIT;
  } else {
    process.env.LOBA_ADMIN_DAILY_LIMIT = previousAdmin;
  }

  if (previousHousehold === undefined) {
    delete process.env.LOBA_HOUSEHOLD_DAILY_LIMIT;
  } else {
    process.env.LOBA_HOUSEHOLD_DAILY_LIMIT = previousHousehold;
  }
});


test("LOBA Admin sépare la réservation du quota du bloc fournisseur", () => {
  const source = fs.readFileSync("app/api/admin/loba/route.ts", "utf8");

  const quotaIndex = source.indexOf(
    'quota = await reserveLobaDailyQuota("admin", admin.id)'
  );
  const providerTryIndex = source.indexOf(
    "try {\n    const response = await fetch(GROQ_ENDPOINT"
  );
  const requestErrorIndex = source.indexOf('status: "request_error"');

  assert.ok(quotaIndex >= 0, "réservation quota Admin absente");
  assert.ok(providerTryIndex > quotaIndex, "le bloc fournisseur doit commencer après le quota");
  assert.ok(requestErrorIndex > providerTryIndex, "request_error doit appartenir au bloc fournisseur");
  assert.ok(source.includes('"LOBA_AI_BUDGET_UNAVAILABLE"'));
});

test("LOBA Foyer sépare la réservation du quota du bloc fournisseur", () => {
  const source = fs.readFileSync("app/api/loba/household/route.ts", "utf8");

  const quotaIndex = source.indexOf(
    'quota=await reserveLobaDailyQuota("household",householdId)'
  );
  const providerTryIndex = source.indexOf(
    "try{const response=await fetch(GROQ_ENDPOINT"
  );
  const requestErrorIndex = source.indexOf('status:"request_error"');

  assert.ok(quotaIndex >= 0, "réservation quota Foyer absente");
  assert.ok(providerTryIndex > quotaIndex, "le bloc fournisseur doit commencer après le quota");
  assert.ok(requestErrorIndex > providerTryIndex, "request_error doit appartenir au bloc fournisseur");
  assert.ok(source.includes('"LOBA_AI_BUDGET_UNAVAILABLE"'));
});
