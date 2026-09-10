import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("app/app/courses/page.tsx", "utf8");
const migration = fs.readFileSync("supabase-migrations/2026-09-10-courses-v2-1-global-stores.sql", "utf8");

test("Courses V2.1: authenticated households can read the shared store catalog", () => {
  assert.match(migration, /create table if not exists public\.global_stores/);
  assert.match(migration, /for select to authenticated[\s\S]*using \(true\)/);
  assert.match(page, /from\("global_stores"\)\.select\("id,name"\)/);
});

test("Courses V2.1: a newly learned store enriches both household and global catalogs", () => {
  assert.match(page, /from\("household_stores"\)\.insert/);
  assert.match(page, /from\("global_stores"\)\.insert/);
});

test("Courses V2.1: global catalog contains no household identifier", () => {
  assert.doesNotMatch(migration, /global_stores[\s\S]{0,300}household_id/);
});

test("Courses V2.1: existing household stores seed the shared catalog", () => {
  assert.match(migration, /select distinct trim\(hs\.name\)[\s\S]*from public\.household_stores hs/);
});
