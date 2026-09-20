import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const onboarding = fs.readFileSync("app/page.tsx", "utf8");
const settings = fs.readFileSync("app/app/reglages/page.tsx", "utf8");
const switcher = fs.readFileSync("components/HouseholdSwitcher.tsx", "utf8");
const inviteNudge = fs.readFileSync("components/InviteNudge.tsx", "utf8");
const types = fs.readFileSync("lib/types.ts", "utf8");
const i18n = fs.readFileSync("lib/i18n.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260917_household_solo_v1.sql", "utf8");

test("Foyer Solo V1 est un type de foyer complet dans le client et la base", () => {
  assert.match(types, /"solo" \| "couple" \| "coloc" \| "famille"/);
  assert.match(migration, /'solo', 'couple', 'coloc', 'famille'/);
  assert.match(migration, /v_type not in \('solo', 'couple', 'coloc', 'famille'\)/);
});

test("Solo est sélectionnable à l'onboarding, dans Réglages et pour un foyer supplémentaire", () => {
  assert.match(onboarding, /option value="solo"/);
  assert.match(settings, /option value="solo"/);
  assert.match(switcher, /option value="solo"/);
});

test("Solo dispose d'un message SMART Eurostat 2025 traçable", () => {
  assert.match(onboarding, /eurostat\/en\/web\/products-eurostat-news\/w\/ddn-20260513-2/);
  assert.match(i18n, /37,5 % des foyers de l’Union européenne/);
  assert.match(i18n, /76,1 millions de foyers/);
});

test("Un foyer solo n'est pas poussé à inviter quelqu'un", () => {
  assert.match(inviteNudge, /householdType === "solo"/);
  assert.match(onboarding, /householdType === "solo" \? t\("onboarding_solo_created_body"\)/);
  assert.match(onboarding, /t\("onboarding_solo_start"\)/);
});

test("Les sept catalogues exposent les clés Solo", () => {
  assert.equal((i18n.match(/onboarding_type_solo:/g) || []).length, 7);
  assert.equal((i18n.match(/onboarding_value_solo_title:/g) || []).length, 7);
  assert.equal((i18n.match(/onboarding_value_solo_fact:/g) || []).length, 7);
  assert.equal((i18n.match(/household_solo:/g) || []).length, 7);
});
