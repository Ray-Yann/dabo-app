import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const onboarding = readFileSync("app/page.tsx", "utf8");
const settings = readFileSync("app/app/reglages/page.tsx", "utf8");
const home = readFileSync("app/app/page.tsx", "utf8");

test("Onboarding V2 transforme le code partagé en lien d'invitation", () => {
  assert.match(settings, /\?invite=\$\{encodeURIComponent\(household\.invite_code\)\}/);
  assert.match(settings, /navigator\.share\(\{ title: "DABO", text, url: inviteUrl \}\)/);
});

test("Onboarding V2 reconnaît automatiquement une invitation ouverte", () => {
  assert.match(onboarding, /URLSearchParams\(window\.location\.search\)\.get\("invite"\)/);
  assert.match(onboarding, /setSetupMode\("join"\)/);
  assert.match(onboarding, /readOnly=\{inviteFromLink\}/);
});

test("Onboarding V2 laisse un utilisateur multi-foyers accepter une invitation", () => {
  // Un membre existant n’est redirigé vers /app que sans invitation entrante.
  assert.match(onboarding, /members\.length > 0 && !incomingInvite/);
  // Avec une invitation, la jointure passe désormais par le RPC sécurisé V2.2.
  assert.match(onboarding, /supabase\.rpc\("join_household_by_invite"/);
  assert.match(onboarding, /p_invite_code: inviteCode\.trim\(\)\.toUpperCase\(\)/);
  assert.match(onboarding, /router\.replace\("\/app"\)/);
});

test("Onboarding V2 propose l'invitation juste après la création sans la forcer", () => {
  assert.match(onboarding, /setSetupMode\("created"\)/);
  assert.match(onboarding, /Ton foyer est prêt/);
  assert.match(onboarding, /Partager l’invitation/);
  assert.match(onboarding, />Plus tard<\/button>/);
});

test("Onboarding V2 offre trois premiers pas utiles sur un foyer neuf", () => {
  assert.match(home, /router\.push\("\/app\/courses"\)/);
  assert.match(home, /router\.push\("\/app\/taches"\)/);
  assert.match(home, /router\.push\("\/app\/calendrier"\)/);
});
