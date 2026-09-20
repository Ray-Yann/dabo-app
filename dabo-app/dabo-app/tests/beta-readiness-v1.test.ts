import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

test("Beta Readiness V1 fournit un écran de récupération applicatif", () => {
  const source = read("app/error.tsx");
  assert.match(source, /reset/);
  assert.match(source, /\/icon\.svg/);
  assert.match(source, /role="alert"/);
  assert.match(source, /fr:|nl:|en:|de:|es:|it:|pt:/);
});

test("Beta Readiness V1 garde un dernier filet de sécurité global", () => {
  const source = read("app/global-error.tsx");
  assert.match(source, /<html/);
  assert.match(source, /<body/);
  assert.match(source, /reset/);
});

test("Beta Readiness V1 lie les actions de compte au JWT vérifié", () => {
  for (const path of ["app/api/delete-account/route.ts", "app/api/leave-household/route.ts", "app/api/remove-member/route.ts"]) {
    const source = read(path);
    assert.match(source, /verifyUserToken\(token\)/);
  }
});

test("Beta Readiness V1 protège le départ du créateur par transfert", () => {
  const source = read("lib/supabase-admin.ts");
  assert.match(source, /transferCreatorAndArchive/);
  assert.match(source, /role: "creator"/);
  assert.match(source, /left_at: new Date\(\)\.toISOString\(\)/);
});

test("Beta Readiness V1 conserve les garde-fous onboarding et rappels", () => {
  const joinMigration = read("supabase-migrations/2026-09-11-onboarding-v2-2-safe-join-role.sql");
  const reminders = read("app/api/daily-reminders/route.ts");
  assert.match(joinMigration, /SECURITY DEFINER/i);
  assert.match(joinMigration, /authenticated/i);
  assert.match(reminders, /CRON_SECRET/);
});
