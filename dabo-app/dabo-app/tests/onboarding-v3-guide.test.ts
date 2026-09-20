import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path: string) => fs.readFileSync(path, "utf8");

test("Onboarding V3 persiste le choix global du tutoriel par utilisateur avec RLS", () => {
  const sql = read("supabase-migrations/2026-09-12-onboarding-v3-tutorial-preferences.sql");
  assert.match(sql, /user_tutorial_preferences/);
  assert.match(sql, /auth\.uid\(\) = user_id/);
  assert.match(sql, /grant select, insert, update/);
});

test("Onboarding V3 permet de désactiver tout le guide depuis chaque IntroTip", () => {
  const tip = read("components/IntroTip.tsx");
  assert.match(tip, /tutorial_never_show/);
  assert.match(tip, /setTutorialEnabled\(supabase, false\)/);
  assert.match(tip, /TUTORIAL_EVENT/);
});

test("Onboarding V3 transforme le rappel membre en chemin Me montrer vers la vraie action", () => {
  const nudge = read("components/InviteNudge.tsx");
  const settings = read("app/app/reglages/page.tsx");
  assert.match(nudge, /\/app\/reglages\?guide=invite/);
  assert.match(settings, /dabo-invite-member/);
  assert.match(settings, /scrollIntoView/);
  assert.match(settings, /ring-2 ring-mustard/);
});

test("Onboarding V3 distingue Plus tard de Ne plus afficher", () => {
  const nudge = read("components/InviteNudge.tsx");
  assert.match(nudge, /tutorial_later/);
  assert.match(nudge, /tutorial_never_show/);
  assert.match(nudge, /setVisible\(false\)/);
  assert.match(nudge, /setTutorialEnabled\(supabase, false\)/);
});

test("Onboarding V3 peut être réactivé depuis Réglages et repart sur les aides contextuelles", () => {
  const settings = read("app/app/reglages/page.tsx");
  assert.match(settings, /tutorial_replay/);
  assert.match(settings, /setTutorialEnabled\(supabase, true\)/);
  assert.match(settings, /clearTutorialLocalStateForUser/);
  const storage = read("lib/tutorial-local-storage.ts");
  assert.match(storage, /dabo-intro-\$\{userId\}-/);
  assert.match(storage, /dabo-invite-nudge-\$\{userId\}-/);
});
