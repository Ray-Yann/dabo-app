import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync('supabase/migrations/20261022_courses_reserves_purchase_sync_v1.sql','utf8');

test('purchase ledger survives deletion of shopping item', () => {
  assert.match(sql, /shopping_item_id uuid references public\.shopping_items\(id\) on delete set null/i);
  assert.match(sql, /purchase_cycle integer not null/i);
  assert.match(sql, /pantry_purchase_sync_current_item/i);
  assert.doesNotMatch(sql, /shopping_item_id uuid primary key references .*on delete cascade/i);
});
test('undo is compensating and keeps movement history', () => {
  assert.match(sql, /v_credit\.movement_id/);
  assert.match(sql, /v_stock\.quantity>=v_credit\.quantity/);
  assert.match(sql, /reversal_movement_id=v_reverse_id/);
  assert.match(sql, /state='correction_needed'/);
});
test('repeat purchase does not suppress a new credit after undo', () => {
  assert.match(sql, /v_previous_cycle\+1/);
  assert.match(sql, /set shopping_item_id=null,updated_at=now\(\)/);
  assert.match(sql, /state in \('correction_needed','reversed'\)/);
});
test('offline retries reuse canonical RPC with atomic stock credit', () => {
  assert.match(sql, /if v_item\.status='bought' then return v_item\.shopping_session_id; end if;/);
  assert.match(sql, /perform public\.dabo_pantry_credit_purchase\(p_item_id\)/);
  assert.match(sql, /pg_advisory_xact_lock/);
});
test('unknown quantities are not invented', () => {
  assert.match(sql, /'needs_quantity','Quantité ou produit à confirmer'/);
  assert.match(sql, /regexp_match\(v_raw, '\^\(\[0-9\]/);
});
test('private credit RPC is not exposed to authenticated users', () => {
  assert.match(sql, /revoke all on function public\.dabo_pantry_credit_purchase\(uuid\) from public,anon,authenticated;/);
});
