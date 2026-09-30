import assert from "node:assert/strict";
import { test } from "node:test";
import manifest from "./fixtures/dabo-scan-v3/real-receipts/manifest.json" with { type: "json" };

test("Scan V3 real corpus contains ten classified documents", () => {
  assert.equal(manifest.documents.length, 10);

  const types = manifest.documents.map((document) => document.expected.documentType);

  assert.equal(types.filter((type) => type === "receipt").length, 6);
  assert.equal(types.filter((type) => type === "payment_receipt").length, 2);
  assert.equal(types.filter((type) => type === "gift_receipt").length, 2);
});

test("every real corpus document has a complete ground-truth envelope", () => {
  for (const document of manifest.documents) {
    assert.ok(document.id);
    assert.ok(document.sourceImage);
    assert.ok(document.expected);
    assert.ok(document.expected.documentType);
    assert.ok(document.expected.merchant);
    assert.ok(document.expected.purchaseDate);
    assert.equal(document.expected.currency, "EUR");
    assert.ok(Array.isArray(document.expected.items));
  }
});

test("payment receipts never invent purchase items", () => {
  const paymentReceipts = manifest.documents.filter(
    (document) => document.expected.documentType === "payment_receipt"
  );

  for (const document of paymentReceipts) {
    assert.equal(document.expected.items.length, 0);
    assert.equal(typeof document.expected.totalAmount, "number");
  }
});

test("gift receipts never invent a missing total or purchase items", () => {
  const giftReceipts = manifest.documents.filter(
    (document) => document.expected.documentType === "gift_receipt"
  );

  for (const document of giftReceipts) {
    assert.equal(document.expected.totalAmount, null);
    assert.equal(document.expected.items.length, 0);
  }
});

test("detailed receipts reconcile known line totals with receipt total", () => {
  const receipts = manifest.documents.filter(
    (document) => document.expected.documentType === "receipt"
  );

  for (const document of receipts) {
    const knownLineTotal = document.expected.items.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    assert.ok(
      Math.abs(knownLineTotal - document.expected.totalAmount!) <= 0.01,
      `${document.id}: line totals do not reconcile with receipt total`
    );
  }
});

