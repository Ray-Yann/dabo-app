import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

test("Beta Onboarding & Resilience V1 internationalise l’entrée DABO selon une langue disponible", () => {
  const onboarding = read("app/page.tsx");
  assert.match(onboarding, /detectAvailableLanguageFromDevice\(\)/);
  assert.match(onboarding, /translate\(memberLang, key\)/);
  assert.match(onboarding, /onboarding_welcome_title/);
  assert.match(onboarding, /onboarding_error_login/);
  assert.doesNotMatch(onboarding, />Bienvenue sur Dabo</);
});

test("Beta Onboarding & Resilience V1 internationalise aussi la récupération de mot de passe", () => {
  const reset = read("app/reset-password/page.tsx");
  assert.match(reset, /detectAvailableLanguageFromDevice\(\)/);
  assert.match(reset, /reset_title/);
  assert.match(reset, /reset_invalid/);
  assert.doesNotMatch(reset, />Nouveau mot de passe/);
});

test("Beta Onboarding & Resilience V1 garde le dernier filet global compréhensible dans les sept langues", () => {
  const globalError = read("app/global-error.tsx");
  for (const lang of ["fr", "nl", "en", "de", "es", "it", "pt"]) {
    assert.match(globalError, new RegExp(`${lang}: \\{ body:`));
  }
  assert.match(globalError, /detectAvailableLanguageFromDevice\(\)/);
});

test("Beta Onboarding & Resilience V1 isole les dismissals du tutoriel par compte", () => {
  const storage = read("lib/tutorial-local-storage.ts");
  const tip = read("components/IntroTip.tsx");
  const nudge = read("components/InviteNudge.tsx");
  assert.match(storage, /dabo-intro-\$\{userId\}-\$\{id\}/);
  assert.match(storage, /dabo-invite-nudge-\$\{userId\}-\$\{householdId\}/);
  assert.match(tip, /supabase\.auth\.getUser\(\)/);
  assert.match(nudge, /supabase\.auth\.getUser\(\)/);
});

test("Beta Onboarding & Resilience V1 ne réinitialise que le tutoriel du compte courant", () => {
  const settings = read("app/app/reglages/page.tsx");
  assert.match(settings, /clearTutorialLocalStateForUser\(userData\.user\.id\)/);
  assert.doesNotMatch(settings, /startsWith\("dabo-intro-"\)/);
});

test("Beta Onboarding & Resilience V1 redirige toutes les routes métier historiques vers les écrans canoniques", () => {
  const routes: Record<string, string> = {
    "app/app/equilibre/budget/page.tsx": "/app/finances",
    "app/app/equilibre/courses/page.tsx": "/app/courses",
    "app/app/equilibre/equilibre/page.tsx": "/app/equilibre",
    "app/app/equilibre/promos/page.tsx": "/app/promos",
    "app/app/equilibre/reglages/page.tsx": "/app/reglages",
    "app/app/equilibre/taches/page.tsx": "/app/taches",
  };
  for (const [path, destination] of Object.entries(routes)) {
    const source = read(path);
    assert.match(source, /redirect\(/);
    assert.match(source, new RegExp(`redirect\\("${destination.replaceAll("/", "\\/")}\\"\\)`));
  }
  assert.doesNotMatch(read("app/app/finances/page.tsx"), /redirect\("\/app\/finances"\)/);
});

test("Beta Onboarding & Resilience V1 transforme les erreurs silencieuses du foyer en récupération explicite", () => {
  const context = read("lib/household-context.tsx");
  const layout = read("app/app/layout.tsx");
  assert.match(context, /loadError/);
  assert.match(context, /if \(myMembersError\) throw myMembersError/);
  assert.match(context, /if \(householdsResult\.error\) throw householdsResult\.error/);
  assert.match(context, /if \(householdMembersResult\.error\) throw householdMembersResult\.error/);
  assert.match(context, /const retry = useCallback/);
  assert.match(layout, /household_load_error_title/);
  assert.match(layout, /HouseholdLoadError/);
  assert.match(layout, /onRetry=\{\(\) => void retry\(\)\}/);
});
