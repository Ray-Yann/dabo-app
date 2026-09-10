import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("app/app/courses/page.tsx", "utf8");
const settings = fs.readFileSync("app/app/reglages/page.tsx", "utf8");
const migration = fs.readFileSync("supabase-migrations/2026-09-10-courses-v2-2-stores-by-country.sql", "utf8");

test("Courses V2.2 filtre le catalogue partagé par pays du foyer", () => {
  assert.match(page, /from\("global_stores"\).*eq\("country_code", household\.country_code \|\| "BE"\)/);
});

test("Courses V2.2 associe un nouveau magasin au pays du foyer", () => {
  assert.match(page, /global_stores"\)\.insert\(\{ name, country_code: household\.country_code \|\| "BE" \}\)/);
});

test("Courses V2.2 stocke le pays au niveau du foyer et le rend modifiable", () => {
  assert.match(migration, /alter table public\.households[\s\S]*add column if not exists country_code text/);
  assert.match(settings, /settings_household_country/);
  assert.match(settings, /country_code: householdCountry/);
});

test("Courses V2.2 garde un catalogue distinct par pays", () => {
  assert.match(migration, /global_stores_country_name_ci_uidx[\s\S]*country_code, lower\(trim\(name\)\)/);
  assert.match(migration, /'Tesco','GB'/);
  assert.match(migration, /'E\.Leclerc','FR'/);
  assert.match(migration, /'Albert Heijn','NL'/);
});
