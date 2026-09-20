import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql=readFileSync("supabase/migrations/20260916_household_action_suggestions_v12.sql","utf8");

test("Suggestions V1.2 persiste explicitement les actions acceptees",()=>{
 assert.match(sql,/create table if not exists public\.household_action_suggestions/i);
 assert.match(sql,/task_id uuid not null/i);
 assert.match(sql,/suggested_member_id uuid not null/i);
 assert.match(sql,/accepted_at timestamptz not null/i);
});

test("Suggestions V1.2 applique attribution et memoire dans une meme fonction transactionnelle",()=>{
 assert.match(sql,/function public\.accept_household_action_suggestion/i);
 assert.match(sql,/update public\.tasks/i);
 assert.match(sql,/insert into public\.household_action_suggestions/i);
});

test("Suggestions V1.2 borne la fonction au foyer actif et a un membre actif",()=>{
 assert.match(sql,/m\.user_id = auth\.uid\(\)/i);
 assert.match(sql,/m\.household_id = p_household_id/i);
 assert.match(sql,/m\.left_at is null/i);
 assert.match(sql,/t\.household_id = p_household_id/i);
});
