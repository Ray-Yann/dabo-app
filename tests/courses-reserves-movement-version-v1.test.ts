import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20261023_courses_reserves_movement_version_v1.sql', 'utf8');
const original = fs.readFileSync('supabase/migrations/20261022_courses_reserves_purchase_sync_v1.sql', 'utf8');

test('version schema, integrity constraints, unique index and trigger are present', () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS movement_version bigint NOT NULL DEFAULT 0/i);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS movement_version bigint;/i);
  assert.match(migration, /CHECK \(movement_version >= 0\)/i);
  assert.match(migration, /CHECK \(movement_version IS NULL OR movement_version > 0\)/i);
  assert.match(migration, /CREATE UNIQUE INDEX pantry_movements_stock_version_unique/i);
  assert.match(migration, /BEFORE INSERT ON public\.pantry_movements/i);
});

test('movement version assigned atomically, not manually', () => {
  assert.match(migration, /IF NEW\.movement_version IS NOT NULL THEN/i);
  assert.match(migration, /SET movement_version = movement_version \+ 1/i);
  assert.match(migration, /WHERE id = NEW\.stock_id AND household_id = NEW\.household_id/i);
  assert.match(migration, /NEW\.movement_version := v_next/i);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.dabo_pantry_assign_movement_version\(\)/i);
});

test('reversal requires credited movement to match current stock version', () => {
  assert.match(migration, /v_stock\.movement_version > 0 and exists/i);
  assert.match(migration, /pm\.id=v_credit\.movement_id/i);
  assert.match(migration, /pm\.movement_version=v_stock\.movement_version/i);
  assert.match(migration, /state='correction_needed'/i);
  assert.doesNotMatch(migration, /order by pm\.created_at desc,pm\.id desc limit 1/i);
});

test('finance and status RPC behavior retained without modifying prior migration', () => {
  assert.match(original, /order by pm\.created_at desc,pm\.id desc limit 1/i);
  assert.match(migration, /returns uuid language plpgsql security definer set search_path = 'public'/i);
  assert.match(migration, /perform public\.dabo_pantry_credit_purchase\(p_item_id\)/i);
  assert.match(migration, /delete from public\.shopping_sessions/i);
  assert.match(migration, /grant execute on function public\.dabo_set_shopping_item_status\(uuid,text\) to authenticated/i);
});
