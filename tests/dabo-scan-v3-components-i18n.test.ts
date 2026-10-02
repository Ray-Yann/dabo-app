import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const view = fs.readFileSync("components/DaboScanView.tsx", "utf8");
const review = fs.readFileSync("components/DaboScanV3Review.tsx", "utf8");

test("les deux composants Scan V3 utilisent le système i18n DABO", () => {
  for (const [name, source] of [["DaboScanView", view], ["DaboScanV3Review", review]] as const) {
    assert.match(source, /import \{[^}]*\buseT\b[^}]*\} from "@\/lib\/language-context"/, name);
    assert.match(source, /const t = useT\(\)/, name);
  }
});

test("DaboScanView ne conserve plus ses principaux textes utilisateur en français en dur", () => {
  for (const text of [
    "Scanner un ticket",
    "Photographier le ticket",
    "Importer une image",
    "Analyser le ticket",
    "Qui a effectué les achats ?",
    "Choisir un membre",
    "Achats enregistrés",
    "Scanner un autre ticket",
  ]) {
    assert.equal(view.includes(text), false, text);
  }
});

test("DaboScanV3Review ne conserve plus ses principaux textes utilisateur en français en dur", () => {
  for (const text of [
    "Vérifier le ticket",
    "Commerce",
    "Date d'achat",
    "Total du ticket",
    "Quantité / poids",
    "Prix unitaire",
    "Total de la ligne",
    "Valider cet article",
    "Confirmer les achats",
  ]) {
    assert.equal(review.includes(text), false, text);
  }
});

