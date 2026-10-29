import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const migration = (name: string) => readFileSync(join(root, 'supabase/migrations', name), 'utf8');
const weekly = migration('20261106_dabo_meal_shopping_weekly_v1.sql');
const needs = migration('20261103_dabo_meal_needs_week_v1.sql');
const shopping = migration('20261029_shopping_insert_unified_v1.sql');
const page = readFileSync(join(root, 'app/app/courses/repas/page.tsx'), 'utf8');

test('weekly bridge requires authenticated active household member', () => {
  assert.match(weekly, /auth\.uid\(\) is null/);
  assert.match(weekly, /m\.household_id = p_household/);
  assert.match(weekly, /m\.left_at is null/);
  assert.match(weekly, /grant execute on function public\.dabo_meal_shopping_add_for_period[\s\S]*to authenticated/);
});
test('period is limited to seven days and selected items are validated', () => {
  assert.match(weekly, /p_to > p_from \+ 6/);
  assert.match(weekly, /jsonb_array_length\(p_selected\) not between 1 and 100/);
  assert.match(weekly, /Invalid ingredient selection/);
});
test('weekly bridge recomputes needs under the shared lock', () => {
  assert.match(weekly, /pg_advisory_xact_lock/);
  assert.match(shopping, /pg_advisory_xact_lock/);
  assert.match(weekly, /hashtextextended\(p_household::text, 93421\)/);
  assert.match(shopping, /hashtextextended\(p_household_id::text, 93421\)/);
  assert.ok(weekly.indexOf('pg_advisory_xact_lock') < weekly.indexOf('from public.dabo_meal_needs_for_period'));
});
test('weekly bridge delegates writes to the shared shopping RPC', () => {
  assert.match(weekly, /return public\.dabo_shopping_add_items\(p_household, v_items, true\)/);
  assert.doesNotMatch(weekly, /insert\s+into\s+public\.shopping_items/i);
  assert.doesNotMatch(weekly, /(?:insert|update|delete)\s+(?:into\s+|from\s+)?public\.pantry_stocks/i);
});
test('inaccessible recipes fail closed in weekly needs', () => {
  assert.match(needs, /not public\.dabo_recipe_can_read\(p\.recipe_id\)/);
  assert.match(needs, /raise exception 'Meal needs unavailable/);
});
test('the page uses the period-aware RPC and never inserts directly', () => {
  assert.match(page, /supabase\.rpc\("dabo_meal_needs_for_period"/);
  assert.match(page, /supabase\.rpc\("dabo_meal_shopping_add_for_period"/);
  assert.doesNotMatch(page, /supabase\.from\("shopping_items"\)\.insert/);
});
test('shopping conflicts are explicit, never silently merged', () => {
  assert.match(shopping, /'multiple_existing'/);
  assert.match(shopping, /'quantity_mismatch'/);
  assert.doesNotMatch(shopping, /dabo_suggestion_product_key/);
});
