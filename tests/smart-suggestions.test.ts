import assert from "node:assert/strict";
import test from "node:test";
import { getSmartSuggestions, normalizeSuggestion } from "@/lib/smart-suggestions";

test("propose Lait dès la lettre L", () => {
  const suggestions = getSmartSuggestions("l", [], { lang: "fr", domain: "courses" });
  assert.ok(suggestions.includes("Lait"));
});

test("apprend un terme du foyer sans le corriger", () => {
  const suggestions = getSmartSuggestions("nd", ["Ndolè"], { lang: "fr", domain: "courses" });
  assert.equal(suggestions[0], "Ndolè");
});

test("la recherche ignore accents et casse", () => {
  assert.equal(normalizeSuggestion("ÉPONGE"), "eponge");
  assert.deepEqual(getSmartSuggestions("epo", ["Éponge"], { lang: "fr", domain: "courses" }), ["Éponge"]);
});

test("ne remplace jamais la saisie par elle-même", () => {
  assert.equal(getSmartSuggestions("Ndolè", ["Ndolè"], { lang: "fr", domain: "courses" }).includes("Ndolè"), false);
});

test("complète un mot français général avant qu'il soit terminé", () => {
  const suggestions = getSmartSuggestions("ral", [], {
    lang: "fr",
    domain: "courses",
    lexicon: ["ralentir", "rallonge", "ralliement"],
  });
  assert.ok(suggestions.includes("Rallonge"));
});

test("utilise le dictionnaire correspondant à la langue active", () => {
  assert.deepEqual(getSmartSuggestions("tooth", [], {
    lang: "en",
    domain: "courses",
    lexicon: ["tooth", "toothbrush", "toothpaste"],
  }).slice(0, 2), ["Toothpaste", "Toothbrush"]);
});

test("les suggestions DABO ne mélangent plus courses et tâches", () => {
  const shopping = getSmartSuggestions("net", [], { lang: "fr", domain: "courses" });
  const tasks = getSmartSuggestions("net", [], { lang: "fr", domain: "tasks" });
  assert.equal(shopping.some((value) => value.startsWith("Nettoyer")), false);
  assert.ok(tasks.some((value) => value.startsWith("Nettoyer")));
});

test("le vocabulaire appris du foyer reste prioritaire sur le dictionnaire général", () => {
  const suggestions = getSmartSuggestions("pa", ["Patate douce"], {
    lang: "fr",
    domain: "courses",
    lexicon: ["papier", "parasol", "partage"],
  });
  assert.equal(suggestions[0], "Patate douce");
});
