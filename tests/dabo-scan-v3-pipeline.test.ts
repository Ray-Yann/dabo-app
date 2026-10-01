import test from "node:test";
import assert from "node:assert/strict";
import { buildReceiptReviewFromOcr } from "@/lib/dabo-scan-v3-pipeline";

test("Scan V3 Pipeline transforme la géométrie OCR en ticket prêt pour la vérification humaine", () => {
  const review = buildReceiptReviewFromOcr({
    source: "photo",
    rawText: [
      "BOUCHERIE TEST",
      "30/09/2026",
      "SAVON",
      "5,00",
      "TOTAL 5,00",
    ].join("\n"),
    items: [
      {
        text: "BOUCHERIE TEST",
        score: 0.99,
        poly: [[10, 10], [200, 10], [200, 30], [10, 30]],
      },
      {
        text: "30/09/2026",
        score: 0.99,
        poly: [[10, 40], [150, 40], [150, 60], [10, 60]],
      },
      {
        text: "SAVON",
        score: 0.95,
        poly: [[10, 80], [100, 80], [100, 100], [10, 100]],
      },
      {
        text: "5,00",
        score: 0.95,
        poly: [[250, 80], [300, 80], [300, 100], [250, 100]],
      },
      {
        text: "TOTAL 5,00",
        score: 0.99,
        poly: [[10, 120], [300, 120], [300, 140], [10, 140]],
      },
    ],
  });

  assert.equal(review.source, "photo");
  assert.equal(review.merchant, "BOUCHERIE TEST");
  assert.equal(review.purchaseDate, "2026-09-30");
  assert.equal(review.totalAmount, 5);
  assert.equal(review.items.length, 1);
  assert.equal(review.items[0].label, "SAVON");
  assert.equal(review.items[0].totalPrice, 5);
});

test("Scan V3 Pipeline conserve un article sans nom comme donnée à vérifier", () => {
  const review = buildReceiptReviewFromOcr({
    source: "photo",
    rawText: "1,445 kg x 7,00 10,12\nTOTAL 10,12",
    items: [
      {
        text: "1,445 kg x 7,00 10,12",
        score: 0.82,
        poly: [[10, 10], [300, 10], [300, 30], [10, 30]],
      },
      {
        text: "TOTAL 10,12",
        score: 0.99,
        poly: [[10, 50], [300, 50], [300, 70], [10, 70]],
      },
    ],
  });

  assert.equal(review.items.length, 1);
  assert.equal(review.items[0].labelNeedsReview, true);
  assert.equal(review.needsReview, true);
  assert.equal(review.canConfirm, false);
});
