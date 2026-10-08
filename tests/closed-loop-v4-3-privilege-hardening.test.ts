import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration=fs.readFileSync("supabase/migrations/2026-10-08-closed-loop-v4-3-privilege-hardening.sql","utf8");
const v4=fs.readFileSync("supabase/migrations/2026-10-07-closed-loop-v4-plan-materialization.sql","utf8");

test("Closed Loop V4.3 revokes direct materialization-table privileges for all non-owner roles",()=>{
  assert.match(migration,/revoke\s+all(?:\s+privileges)?\s+on\s+table\s+public\.closed_loop_materializations\s+from\s+public\s*,\s*anon\s*,\s*authenticated\s*,\s*service_role\s*;/i);
  assert.doesNotMatch(migration,/\bgrant\b/i);
});

test("Closed Loop V4.3 preserves service-role execution of owner-scoped RPC",()=>{
  assert.match(v4,/security definer/i);
  assert.match(v4,/grant execute on function public\.closed_loop_materialize_plan\(uuid,uuid,uuid,jsonb\) to service_role/i);
  assert.doesNotMatch(migration,/\b(revoke|alter|drop)\b[^;]*\bfunction\b/i);
});
