import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

test("Password Recovery V1.1 vérifie la session auprès de Supabase avant la modification", () => {
  const reset = read("app/reset-password/page.tsx");
  assert.match(reset, /supabase\.auth\.getSession\(\)/);
  assert.match(reset, /supabase\.auth\.getUser\(\)/);
  assert.match(reset, /supabase\.auth\.updateUser\(\{ password \}\)/);
});

test("Password Recovery V1.1 explique le cas du mot de passe identique", () => {
  const reset = read("app/reset-password/page.tsx");
  assert.match(reset, /code === "same_password"/);
  assert.match(reset, /reset_same_password/);
});

test("Password Recovery V1.1 explique un mot de passe refusé par la politique de sécurité", () => {
  const reset = read("app/reset-password/page.tsx");
  assert.match(reset, /code === "weak_password"/);
  assert.match(reset, /reset_weak_password/);
});

test("Password Recovery V1.1 distingue une session expirée d'une panne de mise à jour", () => {
  const reset = read("app/reset-password/page.tsx");
  assert.match(reset, /session_not_found/);
  assert.match(reset, /refresh_token_not_found/);
  assert.match(reset, /reset_update_failed/);
  assert.doesNotMatch(reset, /updateError\.message\s*\?\?/);
});

test("Password Recovery V1.1 ne journalise jamais de jeton ou de mot de passe", () => {
  const reset = read("app/reset-password/page.tsx");
  assert.match(reset, /console\.warn\("\[DABO password recovery\] update failed"/);
  assert.match(reset, /code,/);
  assert.match(reset, /status: updateError\.status/);
  assert.doesNotMatch(reset, /console\.(?:log|warn|error)\([^\n]*(?:password|accessToken|refreshToken),/);
});
