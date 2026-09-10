import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("app/api/loba/household/route.ts", "utf8");
const helper = fs.readFileSync("lib/supabase-admin.ts", "utf8");
const migration = fs.readFileSync("supabase-migrations/2026-09-10-loba-finance-rls-authenticated.sql", "utf8");

test("LOBA Finance utilise un client JWT soumis aux RLS", () => {
  assert.match(helper, /export function createUserClient\(token: string\)/);
  assert.match(helper, /Authorization: `Bearer \$\{token\}`/);
  assert.match(route, /financeDb=createUserClient\(token\)/);
  assert.match(route, /financeDb\.from\("finance_transactions"\)/);
  assert.match(route, /financeDb\.from\("finance_bills"\)/);
  assert.match(route, /financeDb\.from\("finance_budgets"\)/);
  assert.doesNotMatch(route, /db\.from\("finance_transactions"\)/);
  assert.doesNotMatch(route, /db\.from\("finance_bills"\)/);
  assert.doesNotMatch(route, /db\.from\("finance_budgets"\)/);
});

test("le RPC de paiement lie l'appel au JWT et n'est plus exposé à service_role", () => {
  assert.match(migration, /auth\.uid\(\) is null or auth\.uid\(\) <> p_actor_user_id/);
  assert.match(migration, /m\.user_id = auth\.uid\(\)/);
  assert.match(migration, /grant execute .* to authenticated;/i);
  assert.match(migration, /revoke all .* from service_role;/i);
});
