import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("app/page.tsx", "utf8");
const i18n = fs.readFileSync("lib/i18n.ts", "utf8");

test("Onboarding Valeur V1 explique le problème avant les fonctionnalités", () => {
  assert.match(page, /type Phase = "loading" \| "value" \| "auth" \| "setup"/);
  assert.match(page, /onboarding_value_title/);
  assert.match(page, /onboarding_value_dabo_title/);
  assert.match(page, /onboarding_value_signature/);
});

test("Onboarding Valeur V1 cite directement une source institutionnelle européenne", () => {
  assert.match(page, /eige\.europa\.eu\/publications-resources\/publications\/sharing-care-closing-gender-gaps-care-survey-2024/);
  assert.match(i18n, /82 % des femmes et 65 % des hommes/);
  assert.match(i18n, /plus de 65 000 personnes, 27 pays de l’UE/);
});

test("Onboarding Valeur V1 adapte la preuve au couple, à la famille et à la colocation", () => {
  assert.match(page, /onboarding_value_\$\{householdType\}_title/);
  assert.match(page, /jomf\.13057/);
  assert.match(page, /ajpy\.12238/);
  assert.match(page, /eige_care_hw__care_hw_distribution_hh/);
});

test("Onboarding Valeur V1 conserve un parcours invitation court", () => {
  assert.match(page, /inviteFromLink \? t\("onboarding_value_join_invite"\) : t\("onboarding_value_start"\)/);
  assert.match(page, /setSetupMode\("join"\)/);
});

test("Onboarding Valeur V1 ne promet ni causalité ni partage 50\/50 imposé", () => {
  assert.match(i18n, /sans imposer un 50\/50/);
  assert.doesNotMatch(i18n, /DABO améliore votre couple|DABO réduit la charge mentale de/);
});
