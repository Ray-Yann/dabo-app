import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const nav = fs.readFileSync("components/DaboMainNav.tsx", "utf8");
const migration = fs.readFileSync("supabase-migrations/2026-09-11-navigation-preferences-grants.sql", "utf8");

test("Navigation Persistence V1.2 accorde les vrais droits SQL au rôle authentifié", () => {
  assert.match(migration, /grant select, insert, update[\s\S]*on table public\.user_navigation_preferences[\s\S]*to authenticated;/);
  assert.match(migration, /revoke truncate, trigger, references[\s\S]*on table public\.user_navigation_preferences[\s\S]*from anon, authenticated;/);
});

test("Navigation Persistence V1.2 vérifie la sauvegarde côté Supabase au lieu de la supposer", () => {
  assert.match(nav, /\.upsert\([\s\S]*?\)\s*\.select\("pinned_tabs"\)\s*\.single\(\)/);
  assert.match(nav, /DABO navigation preference confirmation mismatch/);
  assert.match(nav, /confirmedPinnedRef\.current = confirmed/);
});

test("Navigation Persistence V1.2 ne ferme plus silencieusement la personnalisation après un échec", () => {
  assert.match(nav, /setSaveError\(t\("settings_error_save"\)\)/);
  assert.match(nav, /async function closeMore\(\)[\s\S]*await waitForPreferenceSave\(\)[\s\S]*if \(!saved\) return/);
  assert.match(nav, /role="alert"/);
  assert.match(nav, /disabled=\{savingPreference\}/);
});
