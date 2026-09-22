import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("app/page.tsx", "utf8");
const acquisition = fs.readFileSync("lib/acquisition.ts", "utf8");
const i18n = fs.readFileSync("lib/i18n.ts", "utf8");

test("P4.2 ajoute un aperçu produit à la phase de découverte", () => {
  assert.match(page, /onboarding_discovery_preview_title/);
  assert.match(page, /onboarding_discovery_tasks/);
  assert.match(page, /onboarding_discovery_shopping/);
  assert.match(page, /onboarding_discovery_balance/);
  assert.match(page, /onboarding_discovery_calendar/);
});

test("P4.2 montre des capacités réelles de DABO sans faux compte", () => {
  assert.match(i18n, /onboarding_discovery_tasks/);
  assert.match(i18n, /onboarding_discovery_shopping/);
  assert.match(i18n, /onboarding_discovery_balance/);
  assert.match(i18n, /onboarding_discovery_calendar/);
  assert.doesNotMatch(page, /createDemoUser|createDemoHousehold|demo@dabo/i);
});

test("P4.2 mesure la consultation de l'aperçu produit", () => {
  assert.match(acquisition, /product_preview_viewed/);
  assert.match(page, /trackAcquisitionEvent\("product_preview_viewed"/);
});

test("P4.2 mesure l'engagement avec l'aperçu produit", () => {
  assert.match(acquisition, /product_preview_engaged/);
  assert.match(page, /trackAcquisitionEvent\("product_preview_engaged"/);
});

test("P4.2 conserve le referral existant au lieu de créer un second système", () => {
  assert.match(page, /captureReferralFromUrl\(\)/);
  assert.match(acquisition, /referralToken/);
  assert.doesNotMatch(page, /createReferral|newReferral|referralReward/);
});

test("P4.2 conserve un parcours invitation distinct et court", () => {
  assert.match(page, /inviteFromLink/);
  assert.match(page, /setSetupMode\("join"\)/);
  assert.match(page, /onboarding_value_join_invite/);
});

test("P4.2 ne transforme pas la découverte en mécanique agressive", () => {
  assert.doesNotMatch(page, /autoplay|countdown|limitedOffer|rewardPoints|referralBonus/i);
});

test("P4.2 conserve le funnel de première valeur existant", () => {
  assert.match(acquisition, /first_value/);
  assert.match(acquisition, /landing_view/);
  assert.match(acquisition, /signup_completed/);
  assert.match(acquisition, /household_created/);
});


test("P4.2 ne ralentit pas une invitation foyer avec le Product Preview", () => {
  assert.match(
    page,
    /setPhase\(forgot \|\| incomingInvite \? "auth" : "value"\)/,
    "Un visiteur avec ?invite= doit aller directement vers l'authentification au lieu de passer par le Product Preview."
  );
});


test("P4.2 garde le contrat analytics aligné entre client, API, base et cockpit", () => {
  const acquisitionClient = fs.readFileSync("lib/acquisition.ts", "utf8");
  const acquisitionRoute = fs.readFileSync("app/api/acquisition-event/route.ts", "utf8");
  const dashboardRoute = fs.readFileSync("app/api/admin/dashboard/route.ts", "utf8");
  const adminPage = fs.readFileSync("app/admin/page.tsx", "utf8");
  const migration = fs.readFileSync("supabase/migrations/2026-09-22-p4-2-product-preview-events.sql", "utf8");

  for (const eventName of ["product_preview_viewed", "product_preview_engaged"]) {
    assert.match(acquisitionClient, new RegExp(eventName));
    assert.match(acquisitionRoute, new RegExp(eventName));
    assert.match(dashboardRoute, new RegExp(eventName));
    assert.match(migration, new RegExp(eventName));
  }

  assert.match(adminPage, /productPreviewViewed/);
  assert.match(adminPage, /productPreviewEngaged/);
  assert.match(adminPage, /Aperçu vu/);
  assert.match(adminPage, /Aperçu exploré/);
  assert.doesNotMatch(migration, /create\s+table/i);
});
