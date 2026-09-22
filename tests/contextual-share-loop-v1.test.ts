import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const engine = fs.readFileSync("lib/contextual-share.ts", "utf8");
const share = fs.readFileSync("lib/app-share.ts", "utf8");
const nudge = fs.readFileSync("components/ContextualShareNudge.tsx", "utf8");
const tasks = fs.readFileSync("app/app/taches/page.tsx", "utf8");
const shopping = fs.readFileSync("app/app/courses/page.tsx", "utf8");
const today = fs.readFileSync("app/app/page.tsx", "utf8");
const settings = fs.readFileSync("app/app/reglages/page.tsx", "utf8");
const i18n = fs.readFileSync("lib/i18n.ts", "utf8");

test("P4.1 attend trois réussites avant de proposer le partage", () => {
  assert.match(engine, /CONTEXTUAL_SHARE_SUCCESS_THRESHOLD = 3/);
  assert.match(engine, /successCount < CONTEXTUAL_SHARE_SUCCESS_THRESHOLD/);
});

test("P4.1 garde un état séparé par utilisateur et foyer", () => {
  assert.match(engine, /dabo:contextual-share:\${userId}:\${householdId}/);
});

test("P4.1 applique sept jours après Plus tard et trente jours après partage", () => {
  assert.match(engine, /CONTEXTUAL_SHARE_LATER_MS = 7 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(engine, /CONTEXTUAL_SHARE_SHARED_MS = 30 \* 24 \* 60 \* 60 \* 1000/);
});

test("P4.1 limite le nudge à une fois par session navigateur", () => {
  assert.match(engine, /sessionStorage/);
  assert.match(engine, /contextualShareSessionKey/);
  assert.doesNotMatch(engine, /promptedThisSession = new Set/);
});

test("P4.1 remet le compteur à zéro après un partage réussi", () => {
  assert.match(engine, /successCount: 0/);
});

test("P4.1 compte les tâches après une complétion réussie", () => {
  assert.match(tasks, /else if \(result\.ok\)[\s\S]*recordContextualShareSuccess/);
  assert.match(today, /if \(!result\.ok\)[\s\S]*return;[\s\S]*recordContextualShareSuccess/);
});

test("P4.1 compte les complétions par sous-tâches", () => {
  assert.match(
    tasks,
    /completeHouseholdTask\(\{ supabase, householdId: household\.id,[\s\S]*if \(!result\.ok\)[\s\S]*else \{[\s\S]*recordContextualShareSuccess/,
  );
});

test("P4.1 compte un article uniquement après le RPC réussi vers bought", () => {
  assert.match(
    shopping,
    /dabo_set_shopping_item_status[\s\S]*if \(error\) return;[\s\S]*if \(status === "bought"\)[\s\S]*recordContextualShareSuccess/,
  );
});

test("P4.1 partage le même moteur entre Réglages et le nudge", () => {
  assert.match(settings, /shareDaboApp/);
  assert.match(nudge, /shareDaboApp/);
  assert.doesNotMatch(settings, /async function recordAppShare/);
});

test("P4.1 mesure après l'action de partage réussie", () => {
  const nativeShare = share.indexOf("await navigator.share(shareData)");
  const nativeMeasure = share.indexOf(
    '"native",',
    nativeShare,
  );
  const clipboardShare = share.indexOf("await navigator.clipboard.writeText");
  const clipboardMeasure = share.indexOf(
    '"clipboard",',
    clipboardShare,
  );

  assert.ok(nativeShare >= 0 && nativeMeasure > nativeShare);
  assert.ok(clipboardShare >= 0 && clipboardMeasure > clipboardShare);
});

test("P4.1 ne transforme pas une annulation native en réussite", () => {
  assert.match(share, /AbortError/);
  assert.match(share, /outcome: "cancelled"/);
});

test("P4.1 ne crée aucune persistance Supabase pour l'éligibilité", () => {
  assert.doesNotMatch(engine, /supabase|\.from\(|insert\(|upsert\(/i);
});

test("P4.1 garde le stockage local best-effort", () => {
  assert.match(engine, /localStorage\.setItem/);
  assert.match(engine, /try \{/);
  assert.match(engine, /catch \{/);
});

test("P4.1 devient éligible au moment où le seuil est franchi", () => {
  assert.match(engine, /CONTEXTUAL_SHARE_SUCCESS_EVENT/);
  assert.match(engine, /dispatchEvent/);
  assert.match(nudge, /addEventListener\(CONTEXTUAL_SHARE_SUCCESS_EVENT/);
});

test("P4.1 ne détourne pas first_value de l'activation", () => {
  assert.doesNotMatch(engine, /first_value/);
  assert.doesNotMatch(nudge, /first_value/);
});

test("P4.1 applique le silence après un partage depuis Réglages", () => {
  assert.match(settings, /markContextualShareShared/);
});

test("P4.1 partage l'URL publique canonique", () => {
  assert.match(share, /https:\/\/dabo-app\.vercel\.app\/\?ref=/);
  assert.doesNotMatch(share, /window\.location\.origin/);
});

test("P4.1 place le nudge sur les surfaces de réussite et pas sur Aujourd'hui", () => {
  assert.match(tasks, /ContextualShareNudge/);
  assert.match(shopping, /ContextualShareNudge/);
  assert.doesNotMatch(today, /ContextualShareNudge/);
  assert.match(today, /recordContextualShareSuccess/);
});

test("P4.1 laisse toujours une sortie non culpabilisante", () => {
  assert.match(nudge, /contextual_share_later/);
  assert.doesNotMatch(nudge, /reward|score|ranking|classement/i);
});

test("P4.1 couvre les sept langues DABO", () => {
  assert.equal((i18n.match(/contextual_share_title:/g) || []).length, 7);
  assert.equal((i18n.match(/contextual_share_text:/g) || []).length, 7);
  assert.equal((i18n.match(/contextual_share_action:/g) || []).length, 7);
  assert.equal((i18n.match(/contextual_share_later:/g) || []).length, 7);
  assert.equal((i18n.match(/contextual_share_error:/g) || []).length, 7);
});

console.log("P4.1 targeted tests loaded");
