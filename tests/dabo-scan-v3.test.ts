import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeReceiptExtraction,
  validateReceiptConsistency,
} from "@/lib/dabo-scan-v3";

test("Scan V3 conserve article, quantité, prix unitaire et montant de chaque ligne", () => {
  const receipt = normalizeReceiptExtraction({
    source: "digital_document",
    merchant: "DELHAIZE",
    purchaseDate: "2026-09-29",
    currency: "EUR",
    totalAmount: 9.26,
    rawText: "Lait 2 x 1,89 3,78\nBananes 0,842 kg x 1,99 1,68\nPain complet 3,80",
    items: [
      {
        label: "Lait demi-écrémé",
        quantity: 2,
        unit: "piece",
        unitPrice: 1.89,
        totalPrice: 3.78,
        confidence: 0.98,
      },
      {
        label: "Bananes",
        quantity: 0.842,
        unit: "kg",
        unitPrice: 1.99,
        totalPrice: 1.68,
        confidence: 0.94,
      },
      {
        label: "Pain complet",
        quantity: 1,
        unit: "piece",
        unitPrice: 3.8,
        totalPrice: 3.8,
        confidence: 0.97,
      },
    ],
  });

  assert.equal(receipt.merchant, "DELHAIZE");
  assert.equal(receipt.totalAmount, 9.26);
  assert.equal(receipt.items.length, 3);

  assert.deepEqual(
    receipt.items.map((item) => ({
      label: item.label,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    })),
    [
      {
        label: "Lait demi-écrémé",
        quantity: 2,
        unit: "piece",
        unitPrice: 1.89,
        totalPrice: 3.78,
      },
      {
        label: "Bananes",
        quantity: 0.842,
        unit: "kg",
        unitPrice: 1.99,
        totalPrice: 1.68,
      },
      {
        label: "Pain complet",
        quantity: 1,
        unit: "piece",
        unitPrice: 3.8,
        totalPrice: 3.8,
      },
    ],
  );
});

test("Scan V3 vérifie que les lignes expliquent mathématiquement le total du ticket", () => {
  const receipt = normalizeReceiptExtraction({
    source: "photo",
    totalAmount: 9.26,
    items: [
      { label: "Lait", quantity: 2, unitPrice: 1.89, totalPrice: 3.78, confidence: 0.98 },
      { label: "Bananes", quantity: 0.842, unit: "kg", unitPrice: 1.99, totalPrice: 1.68, confidence: 0.94 },
      { label: "Pain", quantity: 1, unitPrice: 3.8, totalPrice: 3.8, confidence: 0.97 },
    ],
  });

  const consistency = validateReceiptConsistency(receipt);

  assert.equal(consistency.isConsistent, true);
  assert.equal(consistency.itemsTotal, 9.26);
  assert.equal(consistency.difference, 0);
});

test("Scan V3 demande une vérification quand les articles n'expliquent pas le total", () => {
  const receipt = normalizeReceiptExtraction({
    source: "photo",
    totalAmount: 12.5,
    items: [
      { label: "Lait", quantity: 1, unitPrice: 1.89, totalPrice: 1.89, confidence: 0.96 },
      { label: "Pain", quantity: 1, unitPrice: 3.8, totalPrice: 3.8, confidence: 0.96 },
    ],
  });

  const consistency = validateReceiptConsistency(receipt);

  assert.equal(consistency.isConsistent, false);
  assert.equal(consistency.needsReview, true);
  assert.equal(consistency.difference, 6.81);
});

test("Scan V3 marque une ligne incertaine à vérifier au lieu de prétendre qu'elle est fiable", () => {
  const receipt = normalizeReceiptExtraction({
    source: "photo",
    totalAmount: 4.99,
    items: [
      {
        label: "ARTICLE OCR INCERTAIN",
        quantity: 1,
        totalPrice: 4.99,
        confidence: 0.61,
      },
    ],
  });

  assert.equal(receipt.items[0].needsReview, true);
});

test("Scan V3 detecte une ligne dont quantite x prix unitaire ne correspond pas au total de ligne", () => {
  const receipt = normalizeReceiptExtraction({
    source: "photo",
    totalAmount: 4.99,
    items: [
      {
        label: "PRODUIT TEST",
        quantity: 50,
        unit: "piece",
        unitPrice: 4.99,
        totalPrice: 4.99,
        confidence: 1,
      },
    ],
  });

  const consistency = validateReceiptConsistency(receipt);

  assert.equal(consistency.isConsistent, false);
  assert.equal(consistency.needsReview, true);
});
