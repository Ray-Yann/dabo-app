import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const countries = fs.readFileSync("lib/countries.ts", "utf8");
const settings = fs.readFileSync("app/app/reglages/page.tsx", "utf8");
const migration = fs.readFileSync("supabase-migrations/2026-09-10-internationalisation-v1-all-countries.sql", "utf8");

test("Internationalisation V1 couvre un catalogue mondial ISO", () => {
  for (const code of ["BE", "FR", "NL", "GB", "CM", "US", "CA", "BR", "JP", "ZA", "AU", "IN"]) assert.match(countries, new RegExp(`\\b${code}\\b`));
  assert.match(countries, /Intl\.DisplayNames/);
});

test("Internationalisation V1 traduit et trie les noms de pays selon la langue DABO", () => {
  assert.match(settings, /useLanguage/);
  assert.match(settings, /countryOptions\(lang\)/);
  assert.match(countries, /localeCompare/);
});

test("Internationalisation V1 détecte une région ISO du terminal sans GPS", () => {
  assert.match(countries, /navigator\.language/);
  assert.match(countries, /navigator\.languages/);
  assert.doesNotMatch(countries, /geolocation/);
});

test("Internationalisation V1 libère Supabase des quatre pays initiaux", () => {
  assert.match(migration, /\^\[A-Z\]\{2\}\$/);
  assert.doesNotMatch(migration, /country_code in \('BE','FR','NL','GB'\)/);
});
