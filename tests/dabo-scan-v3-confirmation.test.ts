import assert from "node:assert/strict";
import test from "node:test";

import {
  buildConfirmedReceiptPayload,
} from "../lib/dabo-scan-v3-confirmation";
import type { ReceiptReview } from "../lib/dabo-scan-v3-review";

function review(overrides: Partial<ReceiptReview> = {}): ReceiptReview {
  return {
    source: "photo",
    merchant: "Roi du jambon",
    purchaseDate: "2026-09-30",
    totalAmount: 33,
    currency: "EUR",
    rawText: "ticket OCR",
    items: [
      {
        label: "Cotis / Softbones",
        quantity: 3.06,
        unit: "kg",
        unitPrice: 7.2,
        totalPrice: 22.03,
        confidence: 0.98,
        needsReview: false,
        labelNeedsReview: false,
      },
      {
        label: "Poulet dure / Kip gerookt",
        quantity: 1.826,
        unit: "kg",
        unitPrice: 6,
        totalPrice: 10.96,
        confidence: 0.98,
        needsReview: false,
        labelNeedsReview: false,
      },
    ],
    discounts: [
      {
        label: "Arrondi",
        amount: 0.01,
      },
    ],
    unresolvedItems: 0,
    consistency: {
      isConsistent: true,
      needsReview: false,
      itemsTotal: 32.99,
      adjustmentsTotal: 0.01,
      calculatedTotal: 33,
      difference: 0,
    },
    needsReview: false,
    canConfirm: true,
    ...overrides,
  };
}

test("Scan V3 refuse de préparer un ticket qui n'est pas entièrement confirmé", () => {
  assert.throws(
    () =>
      buildConfirmedReceiptPayload(
        review({
          needsReview: true,
          canConfirm: false,
        }),
      ),
    /confirm/i,
  );
});

test("Scan V3 refuse l'enregistrement tant que la date d'achat n'est pas confirmée", () => {
  assert.throws(
    () =>
      buildConfirmedReceiptPayload(
        review({
          purchaseDate: null,
        }),
      ),
    /date/i,
  );
});

test("Scan V3 prépare uniquement les données explicitement confirmées par l'humain", () => {
  const payload = buildConfirmedReceiptPayload(review());

  assert.equal(payload.source, "photo");
  assert.equal(payload.merchant, "Roi du jambon");
  assert.equal(payload.purchaseDate, "2026-09-30");
  assert.equal(payload.totalAmount, 33);
  assert.equal(payload.currency, "EUR");
  assert.equal(payload.rawText, "ticket OCR");
  assert.deepEqual(payload.adjustments, [
    {
      label: "Arrondi",
      amount: 0.01,
    },
  ]);

  assert.deepEqual(payload.items, [
    {
      name: "Cotis / Softbones",
      quantity: 3.06,
      unit: "kg",
      unitPrice: 7.2,
      lineTotal: 22.03,
    },
    {
      name: "Poulet dure / Kip gerookt",
      quantity: 1.826,
      unit: "kg",
      unitPrice: 6,
      lineTotal: 10.96,
    },
  ]);
});
