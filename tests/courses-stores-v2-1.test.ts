import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("app/app/courses/page.tsx", "utf8");
const migration = fs.readFileSync("supabase-migrations/2026-09-10-courses-v2-1-global-stores.sql", "utf8");

test("Courses V2.1: le catalogue partagé historique reste compatible en base", () => {
  assert.match(migration, /create table if not exists public\.global_stores/);
  assert.match(migration, /for select to authenticated[\s\S]*using \(true\)/);
});

test("Courses V2.1 + UX Light V1.2: un magasin appris reste désormais propre au foyer", () => {
  assert.match(page, /from\("household_stores"\)\.insert/);
  assert.doesNotMatch(page, /from\("global_stores"\)\.insert/);
});

test("Courses V2.1: global catalog contains no household identifier", () => {
  assert.doesNotMatch(migration, /global_stores[\s\S]{0,300}household_id/);
});

test("Courses V2.1: existing household stores seed the historical shared catalog", () => {
  assert.match(migration, /select distinct trim\(hs\.name\)[\s\S]*from public\.household_stores hs/);
});
