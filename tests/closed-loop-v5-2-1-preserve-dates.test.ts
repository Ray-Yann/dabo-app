import {readFileSync} from "node:fs";
import {join} from "node:path";
import {test} from "node:test";
import {strict as assert} from "node:assert";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/2026-10-11-closed-loop-v5-2-1-preserve-dates.sql"),
  "utf8"
);

test("V5.2.1 preserves calendar and finance dates after action reconstruction", () => {
  const reconstruct = "v_action := jsonb_build_object(";
  const calendar = "v_action := v_action || jsonb_build_object('eventDate',v_date)";
  const finance = "v_action := v_action || jsonb_build_object('dueOn',v_date)";
  const append = "v_actions := v_actions || jsonb_build_array(v_action)";

  const a = sql.indexOf(reconstruct);
  const b = sql.indexOf(calendar);
  const c = sql.indexOf(finance);
  const d = sql.indexOf(append);

  assert.ok(a >= 0 && a < b && b < c && c < d);
  assert.equal(sql.indexOf(reconstruct, a + reconstruct.length), -1);
  assert.match(sql, /Valid event date required/);
  assert.match(sql, /Valid bill date required/);
  assert.match(sql, /Unexpected action details/);
});

test("V5.2.1 retains authorization and human confirmation checks", () => {
  assert.match(sql, /Draft access denied/);
  assert.match(sql, /Human resolution mode requires confirmation action/);
  assert.match(sql, /SECURITY DEFINER/i);
});