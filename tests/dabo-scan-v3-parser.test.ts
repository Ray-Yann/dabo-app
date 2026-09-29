import test from "node:test";
import assert from "node:assert/strict";
import { parseReceiptText, validateReceiptConsistency } from "@/lib/dabo-scan-v3";

test("Scan V3 comprend un article simple avec son prix", () => {
  const x = parseReceiptText("LAIT DEMI ECREME 1,89\nTOTAL 1,89");

  assert.equal(x.items[0].label, "LAIT DEMI ECREME");
  assert.equal(x.items[0].quantity, 1);
  assert.equal(x.items[0].totalPrice, 1.89);
  assert.equal(x.totalAmount, 1.89);
});

test("Scan V3 comprend plusieurs unités d'un même article", () => {
  const x = parseReceiptText("COCA COLA 2 x 2,35 4,70\nTOTAL 4,70");

  assert.equal(x.items[0].label, "COCA COLA");
  assert.equal(x.items[0].quantity, 2);
  assert.equal(x.items[0].unitPrice, 2.35);
  assert.equal(x.items[0].totalPrice, 4.7);
});

test("Scan V3 comprend un produit vendu au poids", () => {
  const x = parseReceiptText("BANANES 0,842 kg x 1,99 1,68\nTOTAL 1,68");

  assert.equal(x.items[0].label, "BANANES");
  assert.equal(x.items[0].quantity, 0.842);
  assert.equal(x.items[0].unit, "kg");
  assert.equal(x.items[0].unitPrice, 1.99);
  assert.equal(x.items[0].totalPrice, 1.68);
});

test("Scan V3 distingue une remise d'un nouvel article", () => {
  const x = parseReceiptText(
    "COCA COLA 2 x 2,35 4,70\nPROMO COCA COLA -1,00\nTOTAL 3,70",
  );

  assert.equal(x.items.length, 1);
  assert.equal(x.items[0].label, "COCA COLA");
  assert.equal(x.items[0].totalPrice, 4.7);
  assert.equal(x.discounts.length, 1);
  assert.equal(x.discounts[0].amount, -1);
  assert.equal(x.totalAmount, 3.7);
});

test("Scan V3 intègre les remises dans la vérification mathématique du ticket", () => {
  const receipt = parseReceiptText(
    "COCA COLA 2 x 2,35 4,70\nPROMO COCA COLA -1,00\nTOTAL 3,70",
  );

  const consistency = validateReceiptConsistency(receipt);

  assert.equal(consistency.itemsTotal, 4.7);
  assert.equal(consistency.adjustmentsTotal, -1);
  assert.equal(consistency.calculatedTotal, 3.7);
  assert.equal(consistency.difference, 0);
  assert.equal(consistency.isConsistent, true);
  assert.equal(consistency.needsReview, false);
});


test("Scan V3 ne transforme pas sous-total et TVA en articles", () => {
  const receipt = parseReceiptText(
    "DELHAIZE\nLAIT DEMI ECREME 1,89\nPAIN COMPLET 2,50\nSOUS-TOTAL 4,39\nTVA 6% 0,26\nTOTAL 4,39",
  );

  assert.equal(receipt.items.length, 2);
  assert.deepEqual(
    receipt.items.map((item) => item.label),
    ["LAIT DEMI ECREME", "PAIN COMPLET"],
  );
  assert.equal(receipt.totalAmount, 4.39);
});

test("Scan V3 reconstruit un article dont le nom est réparti sur deux lignes", () => {
  const receipt = parseReceiptText(
    "DELHAIZE\nYAOURT GREC\nNATURE 4X125G 3,49\nTOTAL 3,49",
  );

  assert.equal(receipt.items.length, 1);
  assert.equal(receipt.items[0].label, "YAOURT GREC NATURE 4X125G");
  assert.equal(receipt.items[0].quantity, 1);
  assert.equal(receipt.items[0].totalPrice, 3.49);
});

test("Scan V3 tolère une confusion OCR O/0 dans un montant sans modifier le nom de l'article", () => {
  const receipt = parseReceiptText(
    "DELHAIZE\nCOCA COLA 2,5O\nPAIN 1,89\nTOTAL 4,39",
  );

  assert.equal(receipt.items.length, 2);
  assert.equal(receipt.items[0].label, "COCA COLA");
  assert.equal(receipt.items[0].totalPrice, 2.5);
  assert.equal(receipt.items[1].label, "PAIN");
  assert.equal(receipt.items[1].totalPrice, 1.89);
  assert.equal(receipt.totalAmount, 4.39);
});

test("Scan V3 distingue quantité, prix unitaire et total quand une ligne contient plusieurs montants", () => {
  const receipt = parseReceiptText(
    "DELHAIZE\nEAU MINERALE 6 0,75 4,50\nTOTAL 4,50",
  );

  assert.equal(receipt.items.length, 1);
  assert.equal(receipt.items[0].label, "EAU MINERALE");
  assert.equal(receipt.items[0].quantity, 6);
  assert.equal(receipt.items[0].unit, "piece");
  assert.equal(receipt.items[0].unitPrice, 0.75);
  assert.equal(receipt.items[0].totalPrice, 4.5);
  assert.equal(receipt.totalAmount, 4.5);
});

test("Scan V3 ne transforme pas les lignes de paiement en articles", () => {
  const receipt = parseReceiptText(
    "DELHAIZE\nLAIT 1,89\nPAIN 2,50\nTOTAL 4,39\nBANCONTACT 4,39\nCARTE 4,39",
  );

  assert.equal(receipt.items.length, 2);
  assert.deepEqual(
    receipt.items.map((item) => item.label),
    ["LAIT", "PAIN"],
  );
  assert.equal(receipt.totalAmount, 4.39);
});

test("Scan V3 extrait le magasin et la date d'achat d'un ticket européen", () => {
  const receipt = parseReceiptText(
    "DELHAIZE FLAGEY\n29/09/2026 18:42\nLAIT 1,89\nPAIN 2,50\nTOTAL 4,39",
  );

  assert.equal(receipt.merchant, "DELHAIZE FLAGEY");
  assert.equal(receipt.purchaseDate, "2026-09-29");
  assert.equal(receipt.items.length, 2);
  assert.equal(receipt.totalAmount, 4.39);
});

test("Scan V3 refuse une date calendaire invalide au lieu de l'inventer", () => {
  const receipt = parseReceiptText(
    "DELHAIZE\n31/02/2026 18:42\nLAIT 1,89\nTOTAL 1,89",
  );

  assert.equal(receipt.merchant, "DELHAIZE");
  assert.equal(receipt.purchaseDate, null);
  assert.equal(receipt.items.length, 1);
  assert.equal(receipt.items[0].label, "LAIT");
  assert.equal(receipt.totalAmount, 1.89);
});

test("Scan V3 traite une ligne négative de fidélité comme un ajustement et non comme un article", () => {
  const receipt = parseReceiptText(
    "DELHAIZE\nCOCA COLA 4,70\nBON FIDELITE -1,00\nTOTAL 3,70",
  );

  assert.equal(receipt.items.length, 1);
  assert.equal(receipt.items[0].label, "COCA COLA");
  assert.equal(receipt.discounts.length, 1);
  assert.equal(receipt.discounts[0].label, "BON FIDELITE");
  assert.equal(receipt.discounts[0].amount, -1);
  assert.equal(receipt.totalAmount, 3.7);

  const consistency = validateReceiptConsistency(receipt);

  assert.equal(consistency.calculatedTotal, 3.7);
  assert.equal(consistency.isConsistent, true);
  assert.equal(consistency.needsReview, false);
});
