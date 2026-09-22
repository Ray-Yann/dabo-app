import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";



test("P3.3 utilise le schéma canonique des préférences de navigation", () => {
  const route = fs.readFileSync("app/api/export-data/route.ts", "utf8");

  assert.match(
    route,
    /from\("user_navigation_preferences"\)[\s\S]*?select\("pinned_tabs, updated_at"\)/
  );
  assert.doesNotMatch(route, /primary_nav_keys/);
});


test("P3.3 respecte le schéma canonique des perceptions et versionne les droits service_role", () => {
  const route = fs.readFileSync("app/api/export-data/route.ts", "utf8");
  const migration = fs.readFileSync(
    "supabase/migrations/2026-09-22-p3-3-portability-service-role-navigation.sql",
    "utf8"
  );

  assert.match(
    route,
    /from\("member_load_perceptions"\)[\s\S]*?select\("id, household_id, member_id, perception, declared_at, created_at"\)/
  );

  assert.doesNotMatch(
    route,
    /from\("member_load_perceptions"\)[\s\S]*?select\("[^"]*updated_at[^"]*"\)/
  );

  for (const table of [
    "user_navigation_preferences",
    "user_tutorial_preferences",
    "member_life_contexts",
    "member_load_perceptions",
  ]) {
    assert.match(
      migration,
      new RegExp(
        "grant select on table public\\." + table + " to service_role;",
        "i"
      )
    );
  }
});
