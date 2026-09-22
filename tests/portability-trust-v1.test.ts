import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("app/api/export-data/route.ts", "utf8");

test("P3.3 export requires a verified bearer token", () => {
  assert.match(route, /authorization/);
  assert.match(route, /verifyUserToken\(token\)/);
  assert.match(route, /status:\s*401/);
});

test("P3.3 export never uses select star", () => {
  assert.doesNotMatch(route, /select\(\s*["']\*["']\s*\)/);
});

test("P3.3 export never exposes household invite codes", () => {
  assert.doesNotMatch(route, /invite_code/);
});

test("P3.3 export scopes member data to the authenticated account", () => {
  assert.match(route, /\.eq\(["']user_id["'],\s*userId\)/);
});

test("P3.3 export scopes private member data to authenticated memberships", () => {
  assert.match(route, /member_life_contexts/);
  assert.match(route, /member_load_perceptions/);
  assert.match(route, /\.in\(["']member_id["'],\s*memberIds\)/);
});

test("P3.3 export includes only personal calendar events owned by authenticated memberships", () => {
  assert.match(route, /\.eq\(["']visibility["'],\s*["']personal["']\)/);
  assert.match(route, /\.in\(["']private_owner_id["'],\s*memberIds\)/);
});

test("P3.3 export does not persist an export copy", () => {
  assert.doesNotMatch(route, /\.insert\s*\(/);
  assert.doesNotMatch(route, /\.upsert\s*\(/);
  assert.doesNotMatch(route, /\.update\s*\(/);
});

test("P3.3 export is explicitly non-cacheable", () => {
  assert.match(route, /["']Cache-Control["']:\s*["']no-store["']/);
});

test("P3.3 export uses a versioned portable JSON format", () => {
  assert.match(route, /dabo-portability-v1/);
  assert.match(route, /application\/json; charset=utf-8/);
  assert.match(route, /Content-Disposition/);
});

test("P3.3 export gets account email from verified server-side auth", () => {
  assert.match(route, /admin\.auth\.admin\.getUserById\(userId\)/);
  assert.doesNotMatch(route, /req\.json\(\)/);
});
