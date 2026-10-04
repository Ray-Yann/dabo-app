import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs";
const migration=fs.readFileSync("supabase/migrations/2026-09-11-navigation-preferences-grants.sql","utf8"); const nav=fs.readFileSync("components/DaboMainNav.tsx","utf8");
test("L'ancienne migration de préférences reste sûre pour les données existantes",()=>{assert.match(migration,/grant select, insert, update/);assert.match(migration,/revoke truncate, trigger, references/);});
test("Navigation V2 ne supprime pas les données historiques mais ne dépend plus de leur écriture",()=>{assert.doesNotMatch(nav,/\.upsert\(/);assert.match(nav,/tab_my_household/);});
