import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const settings = fs.readFileSync("app/app/reglages/page.tsx", "utf8");
const onboarding = fs.readFileSync("app/page.tsx", "utf8");
const languages = fs.readFileSync("lib/languages.ts", "utf8");

test("Internationalisation V2 remplace les boutons de langue par une liste déroulante", () => {
  assert.match(settings, /<select[\s\S]*id="dabo-language"/);
  assert.doesNotMatch(settings, /LANGUAGES\.map/);
  assert.match(onboarding, /AVAILABLE_LANGUAGE_OPTIONS\.map/);
});

test("Internationalisation V2 garde FR NL EN activables", () => {
  for (const code of ["fr", "nl", "en"]) {
    assert.match(languages, new RegExp(`code: "${code}"[\\s\\S]{0,80}available: true`));
  }
});

test("Internationalisation V2.1 active allemand espagnol italien et portugais après traduction complète", () => {
  for (const code of ["de", "es", "it", "pt"]) {
    assert.match(languages, new RegExp(`code: "${code}"[\\s\\S]{0,100}available: true`));
  }

  // Le sélecteur reste générique: une future langue déclarée indisponible
  // sera toujours désactivée tant que son catalogue n'est pas complet.
  assert.match(settings, /disabled=!\{language\.available\}|disabled=\{!language\.available\}/);
});

test("Internationalisation V2 centralise la détection de langue du terminal", () => {
  assert.match(languages, /detectAvailableLanguageFromDevice/);
  assert.match(onboarding, /detectAvailableLanguageFromDevice\(\)/);
});
