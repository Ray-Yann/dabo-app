import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const i18n = fs.readFileSync("lib/i18n.ts", "utf8");

const expected = [
  'notif_bill_paid: "La facture « {bill} » a été marquée comme payée"',
  'notif_bill_paid: "De factuur ‘{bill}’ is als betaald gemarkeerd"',
  'notif_bill_paid: "The bill “{bill}” was marked as paid"',
  'notif_bill_paid: "Die Rechnung „{bill}“ wurde als bezahlt markiert"',
  'notif_bill_paid: "La factura «{bill}» se marcó como pagada"',
  'notif_bill_paid: "La fattura «{bill}» è stata contrassegnata come pagata"',
  'notif_bill_paid: "A fatura «{bill}» foi marcada como paga"',
];

test("notif_bill_paid existe exactement une fois dans chacune des 7 langues", () => {
  const occurrences = i18n.match(/notif_bill_paid:/g) ?? [];
  assert.equal(occurrences.length, 7);
});

test("notif_bill_paid utilise le placeholder serveur bill dans les 7 langues", () => {
  const lines = i18n
    .split(/\r?\n/)
    .filter(line => line.includes("notif_bill_paid:"));

  assert.equal(lines.length, 7);

  for (const line of lines) {
    assert.match(line, /\{bill\}/);
    assert.doesNotMatch(line, /\{name\}/);
  }
});

test("notif_bill_paid possede les 7 traductions validees", () => {
  for (const translation of expected) {
    assert.ok(
      i18n.includes(translation),
      `Traduction manquante: ${translation}`
    );
  }
});
