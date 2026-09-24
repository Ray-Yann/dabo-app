import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const loba = fs.readFileSync("components/LobaHouseholdChat.tsx", "utf8");

test("LOBA client importe la politique et les helpers de notification", () => {
  assert.match(
    loba,
    /import\s*{[^}]*lobaNotificationPlan[^}]*}\s*from\s*["']@\/lib\/loba-notification-policy["']/
  );

  assert.match(
    loba,
    /import\s*{[^}]*notifyHousehold[^}]*notifyMembers[^}]*notifyBillPaid[^}]*}\s*from\s*["']@\/lib\/notifications["']/
  );
});

test("LOBA client dispose du membre acteur courant", () => {
  assert.match(
    loba,
    /const\s*{[^}]*household[^}]*me[^}]*supabase[^}]*}\s*=\s*useHousehold\(\)/
  );
});

test("LOBA construit le plan seulement apres une confirmation serveur reussie", () => {
  const confirmStart = loba.indexOf("async function confirm()");
  assert.notEqual(confirmStart, -1);

  const successCheck = loba.indexOf("if(!res.ok)", confirmStart);
  const planIndex = loba.indexOf("lobaNotificationPlan(", confirmStart);

  assert.notEqual(successCheck, -1);
  assert.notEqual(planIndex, -1);
  assert.ok(planIndex > successCheck);
});

test("LOBA construit le plan avec action et acteur", () => {
  assert.match(
    loba,
    /lobaNotificationPlan\(\s*{[\s\S]*?action[\s\S]*?actorMemberId:\s*me\.id[\s\S]*?actorFirstName:\s*me\.first_name[\s\S]*?}\s*\)/
  );
});

test("LOBA route les notifications ciblees vers notifyMembers", () => {
  assert.match(
    loba,
    /notifyMembers\(\s*supabase\s*,\s*household\.id\s*,\s*me\.id\s*,[\s\S]*?targetMemberIds[\s\S]*?\.key[\s\S]*?\.params/
  );
});

test("LOBA route les notifications foyer vers notifyHousehold", () => {
  assert.match(
    loba,
    /notifyHousehold\(\s*supabase\s*,\s*household\.id\s*,\s*me\.id\s*,[\s\S]*?\.key[\s\S]*?\.params/
  );
});

test("LOBA utilise notifyBillPaid avec resourceId pour les factures", () => {
  assert.match(
    loba,
    /notifyBillPaid\(\s*supabase\s*,\s*household\.id\s*,\s*me\.id\s*,[\s\S]*?\.resourceId\s*\)/
  );
});

test("LOBA ne transmet pas billLabel a notifyBillPaid", () => {
  assert.doesNotMatch(
    loba,
    /notifyBillPaid\([^)]*billLabel/
  );
});
