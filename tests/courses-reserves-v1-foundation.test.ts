import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const sql = readFileSync('supabase/migrations/20261020_courses_reserves_v1.sql','utf8');
const ui = readFileSync('app/app/courses/reserves/page.tsx','utf8');
test('inventaire : trois tables, isolation RLS et aucun droit écriture direct', () => {
 for (const table of ['pantry_locations','pantry_stocks','pantry_movements']) {
  assert.match(sql, new RegExp(`create table if not exists public\\.${table}`));
  assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  assert.match(sql, new RegExp(`m\\.household_id=${table}\\.household_id`));
 }
 assert.match(sql, /revoke all on public\.pantry_locations,public\.pantry_stocks,public\.pantry_movements from anon,authenticated/);
});
test('inventaire : écritures atomiques et appartenance au foyer', () => {
 for (const fn of ['pantry_location_create','pantry_stock_create','pantry_stock_change']) {
  assert.match(sql, new RegExp(`function public\\.${fn}`));
 }
 assert.ok((sql.match(/m\.user_id=auth\.uid\(\) and m\.left_at is null/g)??[]).length>=6);
 assert.match(sql, /for update/);
 assert.match(sql, /v_after<0/);
 assert.match(sql, /foreign key \(location_id, household_id\)/);
});
test('inventaire : aucun stock créé automatiquement à partir des courses', () => {
 assert.match(ui, /pantry_stock_create/);
 assert.match(ui, /pantry_stock_change/);
 assert.doesNotMatch(ui, /shopping_items/);
 assert.match(ui, /offlineFallback/);
});

test('inventaire : quantités précises, unités à la pièce et mouvements non ambigus', () => {
 assert.match(sql, /p_quantity <> round\(p_quantity,3\)/);
 assert.match(sql, /p_delta<>round\(p_delta,3\)/);
 assert.match(sql, /p_unit='piece' and p_quantity<>trunc\(p_quantity\)/);
 assert.match(sql, /v_stock.unit='piece' and p_delta<>trunc\(p_delta\)/);
 assert.match(sql, /p_destination is not null and p_delta<>0/);
 assert.match(sql, /p_delta=0 and \(p_destination is null or p_destination=v_stock.location_id\)/);
});
