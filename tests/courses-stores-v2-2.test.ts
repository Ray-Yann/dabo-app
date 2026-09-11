import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("app/app/courses/page.tsx", "utf8");
const settings = fs.readFileSync("app/app/reglages/page.tsx", "utf8");
const migration = fs.readFileSync("supabase-migrations/2026-09-10-courses-v2-2-stores-by-country.sql", "utf8");

test("Courses V2.2 + UX Light V1.2.1 utilise uniquement le catalogue vérifié du pays dans le sélecteur", () => {
  assert.match(page, /VERIFIED_STORE_SUPPLEMENTS\[household\?\.country_code/);
  assert.doesNotMatch(page, /api\/store-suggestions\?country=/);
  assert.doesNotMatch(page, /from\("global_stores"\)\.select/);
});

test("Courses V2.2 + UX Light V1.2 n'élève plus un magasin manuel au rang national", () => {
  assert.match(page, /household_stores"\)\.insert/);
  assert.doesNotMatch(page, /global_stores"\)\.insert/);
});

test("Courses V2.2 stocke le pays au niveau du foyer et le rend modifiable", () => {
  assert.match(migration, /alter table public\.households[\s\S]*add column if not exists country_code text/);
  assert.match(settings, /settings_household_country/);
  assert.match(settings, /country_code: householdCountry/);
});

test("Courses V2.2 garde le catalogue historique distinct par pays", () => {
  assert.match(migration, /global_stores_country_name_ci_uidx[\s\S]*country_code, lower\(trim\(name\)\)/);
  assert.match(migration, /'Tesco','GB'/);
  assert.match(migration, /'E\.Leclerc','FR'/);
  assert.match(migration, /'Albert Heijn','NL'/);
});
