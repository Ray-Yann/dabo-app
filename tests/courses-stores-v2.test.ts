import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("app/app/courses/page.tsx", "utf8");
const migration = fs.readFileSync("supabase-migrations/2026-09-10-courses-v2-stores.sql", "utf8");

test("Courses V2 stores: custom store is persisted for the household", () => {
  assert.match(page, /from\("household_stores"\)\.insert/);
  assert.match(migration, /create table if not exists public\.household_stores/);
});

test("Courses V2 stores: shopping items keep a store name", () => {
  assert.match(migration, /add column if not exists store_name text null/);
  assert.match(page, /store_name: storeName \|\| null/);
});

test("Courses V2 stores: another store can be entered manually", () => {
  assert.match(page, /OTHER_STORE/);
  assert.match(page, /courses_store_custom_placeholder/);
});

test("Courses V2 stores: active shopping is grouped by store", () => {
  assert.match(page, /const toBuyGroups/);
  assert.match(page, /courses_store_none_group/);
  assert.match(page, /toBuyGroups\.map/);
});
