import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const loading = fs.readFileSync("components/LoadingState.tsx", "utf8");
const onboarding = fs.readFileSync("app/page.tsx", "utf8");
const i18n = fs.readFileSync("lib/i18n.ts", "utf8");

test("Onboarding V2.1 utilise le vrai logo DABO pendant le chargement", () => {
  assert.match(loading, /src="\/icon\.svg"/);
  assert.doesNotMatch(loading, /CheckSquare/);
});

test("Onboarding V2.1 garde le vrai logo DABO sur l'entrée onboarding", () => {
  assert.match(onboarding, /src="\/icon\.svg" alt="DABO"/);
});

test("Onboarding V2.1 ne parle plus d'un code situé au-dessus sur la Home", () => {
  assert.doesNotMatch(i18n, /code ci-dessus|code hierboven|code above|obigen Code|código anterior|codice qui sopra|código acima/);
});
