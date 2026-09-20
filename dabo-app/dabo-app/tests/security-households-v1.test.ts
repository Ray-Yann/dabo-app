import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase-migrations/2026-09-12-security-households-v1.sql", "utf8");
const onboarding = readFileSync("app/page.tsx", "utf8");
const switcher = readFileSync("components/HouseholdSwitcher.tsx", "utf8");

test("Security Households V1 ne rend plus tous les foyers lisibles aux comptes connectés", () => {
  assert.match(migration, /drop policy if exists "Voir un foyer \(connecté\)"/);
  assert.match(migration, /using \(public\.is_active_household_member\(id\)\)/);
  assert.doesNotMatch(migration, /using \(auth\.uid\(\) IS NOT NULL\)/i);
});

test("Security Households V1 retire les insertions directes de foyers et membres", () => {
  assert.match(migration, /drop policy if exists "Créer un foyer"/);
  assert.match(migration, /drop policy if exists "Rejoindre un foyer"/);
  assert.doesNotMatch(onboarding, /\.from\("households"\)\s*\.insert/);
  assert.doesNotMatch(onboarding, /\.from\("members"\)\.insert/);
  assert.doesNotMatch(switcher, /\.from\("households"\)\s*\.insert/);
  assert.doesNotMatch(switcher, /\.from\("members"\)\.insert/);
});

test("Security Households V1 crée foyer et creator atomiquement côté base", () => {
  assert.match(migration, /create or replace function public\.create_household_with_creator/);
  assert.match(migration, /security definer/i);
  assert.match(migration, /insert into public\.households/);
  assert.match(migration, /insert into public\.members/);
  assert.match(migration, /grant execute on function public\.create_household_with_creator\(text, text, text, text\) to authenticated/);
  assert.match(onboarding, /rpc\("create_household_with_creator"/);
  assert.match(switcher, /rpc\("create_household_with_creator"/);
});

test("Security Households V1 fait aussi rejoindre les foyers supplémentaires par le RPC sûr", () => {
  assert.match(switcher, /rpc\("join_household_by_invite"/);
  assert.doesNotMatch(switcher, /\.eq\("invite_code"/);
  assert.doesNotMatch(switcher, /count:\s*"exact"/);
});

test("Security Households V1 bloque les mutations directes de champs d'adhésion et l'auto-promotion", () => {
  assert.match(migration, /revoke update on table public\.members from authenticated/);
  assert.match(migration, /grant update \(first_name, language, dark_mode, avatar_color, avatar_url, avatar_path, avatar_emoji\)/);
  assert.doesNotMatch(migration, /grant update \([^)]*role/i);
  assert.doesNotMatch(migration, /grant update \([^)]*household_id/i);
  assert.doesNotMatch(migration, /grant update \([^)]*user_id/i);
});

test("Security Households V1 réserve la promotion au creator via un RPC dédié", () => {
  const settings = readFileSync("app/app/reglages/page.tsx", "utf8");
  assert.match(migration, /create or replace function public\.promote_household_member_to_creator/);
  assert.match(migration, /if not public\.is_household_creator\(v_household_id\)/);
  assert.match(settings, /rpc\("promote_household_member_to_creator"/);
  assert.doesNotMatch(settings, /from\("members"\)\.update\(\{ role: "creator"/);
});
