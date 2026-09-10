import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("app/api/loba/household/route.ts", "utf8");

test("LOBA foyer journalise les erreurs fournisseur sans exposer la clé ni le contexte du foyer", () => {
  assert.match(route, /\[household\/loba\] Groq provider error/);
  assert.match(route, /status:response\.status/);
  assert.match(route, /statusText:response\.statusText/);
  assert.match(route, /error:groqErrorSummary\(providerRaw\)/);
  assert.match(route, /Bearer \[redacted\]/);
  assert.match(route, /console\.error\("\[household\/loba\] Groq provider error",\{status:response\.status,statusText:response\.statusText,model,error:groqErrorSummary\(providerRaw\)\}\)/);
  assert.match(route, /console\.error\("\[household\/loba\] AI request failed",safeRequestError\(error\)\)/);
});

test("LOBA foyer journalise aussi les exceptions réseau et les réponses IA vides", () => {
  assert.match(route, /\[household\/loba\] AI request failed/);
  assert.match(route, /safeRequestError\(error\)/);
  assert.match(route, /\[household\/loba\] Groq empty response/);
  assert.match(route, /LOBA_AI_EMPTY_RESPONSE/);
  assert.match(route, /LOBA_AI_PROVIDER_ERROR/);
});
