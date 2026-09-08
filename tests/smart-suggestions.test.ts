import test from "node:test";
import assert from "node:assert/strict";
import { getSmartSuggestions } from "@/lib/smart-suggestions";

test("propose Lait dès la lettre L", () => {
  assert.ok(getSmartSuggestions("L", []).includes("Lait"));
});

test("apprend un terme du foyer sans le corriger", () => {
  assert.equal(getSmartSuggestions("nd", ["Ndolè"])[0], "Ndolè");
});

test("la recherche ignore accents et casse", () => {
  assert.equal(getSmartSuggestions("NDO", ["Ndolè"])[0], "Ndolè");
});

test("ne remplace jamais la saisie par elle-même", () => {
  assert.equal(getSmartSuggestions("Ndolè", ["Ndolè"]).includes("Ndolè"), false);
});
