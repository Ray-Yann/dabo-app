import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/page.tsx", "utf8");
const migration = readFileSync("supabase-migrations/2026-09-11-onboarding-v2-2-safe-join-role.sql", "utf8");

test("Onboarding V2.2 attribue le rôle lors de la jointure côté base et non via un count RLS client", () => {
  assert.match(page, /rpc\("join_household_by_invite"/);
  assert.doesNotMatch(page, /role:\s*\(count \|\| 0\) === 0 \? "creator" : "member"/);
});

test("Onboarding V2.2 conserve le cas foyer migré vide sans promouvoir un invité d'un foyer existant", () => {
  assert.match(migration, /v_role := case when v_active_count = 0 then 'creator' else 'member' end;/);
  assert.match(migration, /where m\.household_id = v_household_id[\s\S]*m\.left_at is null/);
});

test("Onboarding V2.2 sérialise les jointures et limite le RPC aux utilisateurs authentifiés", () => {
  assert.match(migration, /for update;/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /grant execute on function public\.join_household_by_invite\(text, text, text\) to authenticated;/i);
});
