import test from "node:test";
import assert from "node:assert/strict";
import { applyReceiptItemCorrection, buildReceiptReview,
  confirmReceiptReviewItem,
  applyReceiptReviewCorrection,
} from "@/lib/dabo-scan-v3-review";
import { normalizeReceiptExtraction } from "@/lib/dabo-scan-v3";

test("Scan V3 Review bloque l'enregistrement tant qu'un article OCR doit Ãªtre vÃ©rifiÃ©", () => {
  const review = buildReceiptReview({
    source: "digital_document",
    merchant: "BOUCHERIE TEST",
    purchaseDate: "2026-09-30",
    totalAmount: 10.12,
    currency: "EUR",
    rawText: "1,445 kg x 7,00 10,12",
    items: [
      {
        label: "Article Ã  identifier",
        quantity: 1.445,
        unit: "kg",
        unitPrice: 7,
        totalPrice: 10.12,
        confidence: 1,
        labelNeedsReview: true,
        needsReview: true,
      },
    ],
    discounts: [],
  });

  assert.equal(review.canConfirm, false);
  assert.equal(review.needsReview, true);
  assert.equal(review.unresolvedItems, 1);
  assert.equal(review.items[0].needsReview, true);
  assert.equal(review.items[0].label, "Article Ã  identifier");
});


test("Scan V3 Review rend le ticket confirmable aprÃ¨s correction humaine de l'article", () => {
  const initial = buildReceiptReview({
    source: "digital_document",
    merchant: "BOUCHERIE TEST",
    purchaseDate: "2026-09-30",
    totalAmount: 10.12,
    currency: "EUR",
    rawText: "1,445 kg x 7,00 10,12",
    items: [
      {
        label: "Article Ã  identifier",
        quantity: 1.445,
        unit: "kg",
        unitPrice: 7,
        totalPrice: 10.12,
        confidence: 1,
        labelNeedsReview: true,
        needsReview: true,
      },
    ],
    discounts: [],
  });

  const corrected = applyReceiptItemCorrection(initial, 0, {
    label: "BÅ“uf",
    quantity: 1.445,
    unit: "kg",
    unitPrice: 7,
    totalPrice: 10.12,
  });

  assert.equal(corrected.items[0].label, "BÅ“uf");
  assert.equal(corrected.items[0].needsReview, false);
  assert.equal(corrected.unresolvedItems, 0);
  assert.equal(corrected.needsReview, false);
  assert.equal(corrected.canConfirm, true);
});


test("Scan V3 Review refuse une correction humaine mathÃ©matiquement incohÃ©rente", () => {
  const initial = buildReceiptReview({
    source: "digital_document",
    merchant: "BOUCHERIE TEST",
    purchaseDate: "2026-09-30",
    totalAmount: 10.12,
    currency: "EUR",
    rawText: "1,445 kg x 7,00 10,12",
    items: [
      {
        label: "Article Ã  identifier",
        quantity: 1.445,
        unit: "kg",
        unitPrice: 7,
        totalPrice: 10.12,
        confidence: 1,
        labelNeedsReview: true,
        needsReview: true,
      },
    ],
    discounts: [],
  });

  const corrected = applyReceiptItemCorrection(initial, 0, {
    label: "BÅ“uf",
    quantity: 1.445,
    unit: "kg",
    unitPrice: 7,
    totalPrice: 12,
  });

  assert.equal(corrected.canConfirm, false);
  assert.equal(corrected.needsReview, true);
  assert.equal(corrected.items[0].needsReview, true);
});


test("Scan V3 Review bloque un ticket dont le total global ne correspond pas aux articles", () => {
  const review = buildReceiptReview({
    source: "digital_document",
    merchant: "MAGASIN TEST",
    purchaseDate: "2026-09-30",
    totalAmount: 12,
    currency: "EUR",
    rawText: "Produit test 2 x 5,00 10,00\nTOTAL 12,00",
    items: [
      {
        label: "Produit test",
        quantity: 2,
        unit: "piece",
        unitPrice: 5,
        totalPrice: 10,
        confidence: 1,
        labelNeedsReview: false,
        needsReview: false,
      },
    ],
    discounts: [],
  });

  assert.equal(review.unresolvedItems, 0);
  assert.equal(review.consistency.itemsTotal, 10);
  assert.equal(review.consistency.calculatedTotal, 10);
  assert.equal(review.consistency.difference, 2);
  assert.equal(review.consistency.isConsistent, false);
  assert.equal(review.needsReview, true);
  assert.equal(review.canConfirm, false);
});


test("Scan V3 Review accepte un ticket cohÃ©rent avec un ajustement d'arrondi", () => {
  const review = buildReceiptReview({
    source: "digital_document",
    merchant: "BOUCHERIE TEST",
    purchaseDate: "2026-09-30",
    totalAmount: 61.60,
    currency: "EUR",
    rawText: "TOTAL 61,62\nArrondi -0,02\nTOTAL ARRONDI 61,60",
    items: [
      {
        label: "Article A",
        quantity: 1,
        unit: "piece",
        unitPrice: 10.12,
        totalPrice: 10.12,
        confidence: 1,
        labelNeedsReview: false,
        needsReview: false,
      },
      {
        label: "Article B",
        quantity: 1,
        unit: "piece",
        unitPrice: 15,
        totalPrice: 15,
        confidence: 1,
        labelNeedsReview: false,
        needsReview: false,
      },
      {
        label: "Article C",
        quantity: 1,
        unit: "piece",
        unitPrice: 19,
        totalPrice: 19,
        confidence: 1,
        labelNeedsReview: false,
        needsReview: false,
      },
      {
        label: "Article D",
        quantity: 1,
        unit: "piece",
        unitPrice: 17.50,
        totalPrice: 17.50,
        confidence: 1,
        labelNeedsReview: false,
        needsReview: false,
      },
    ],
    discounts: [
      {
        label: "Arrondi",
        amount: -0.02,
      },
    ],
  });

  assert.equal(review.consistency.itemsTotal, 61.62);
  assert.equal(review.consistency.adjustmentsTotal, -0.02);
  assert.equal(review.consistency.calculatedTotal, 61.60);
  assert.equal(review.consistency.difference, 0);
  assert.equal(review.consistency.isConsistent, true);
  assert.equal(review.needsReview, false);
  assert.equal(review.canConfirm, true);
});


test("Scan V3 Review conserve la source photo aprÃ¨s correction humaine", () => {
  const review = buildReceiptReview({
    source: "photo",
    merchant: "Maison de la viande",
    purchaseDate: "2026-09-30",
    totalAmount: 10.12,
    currency: "EUR",
    rawText: "1.445 kg x 7.00 10.12",
    discounts: [],
    items: [
      {
        label: "Article Ã  identifier",
        quantity: 1.445,
        unit: "kg",
        unitPrice: 7,
        totalPrice: 10.12,
        confidence: 0.7,
        labelNeedsReview: true,
        needsReview: true,
      },
    ],
  });

  const corrected = applyReceiptItemCorrection(review, 0, {
    label: "BÅ“uf",
    quantity: 1.445,
    unit: "kg",
    unitPrice: 7,
    totalPrice: 10.12,
  });

  assert.equal(corrected.source, "photo");
});


test("Scan V3 Review accepte un article sans quantitÃ© ni prix unitaire quand le ticket ne les fournit pas", () => {
  const review = buildReceiptReview({
    source: "photo",
    merchant: "Exemple",
    purchaseDate: "2026-09-30",
    totalAmount: 5,
    currency: "EUR",
    rawText: "SAVON 5.00",
    discounts: [],
    items: [
      {
        label: "SAVON",
        quantity: null,
        unit: null,
        unitPrice: null,
        totalPrice: 5,
        confidence: 0.7,
        labelNeedsReview: false,
        needsReview: true,
      },
    ],
  });

  const corrected = applyReceiptItemCorrection(review, 0, {
    label: "Savon",
    quantity: null,
    unit: null,
    unitPrice: null,
    totalPrice: 5,
  });

  assert.equal(corrected.items[0].quantity, null);
  assert.equal(corrected.items[0].unitPrice, null);
  assert.equal(corrected.items[0].totalPrice, 5);
  assert.equal(corrected.items[0].needsReview, false);
  assert.equal(corrected.consistency.isConsistent, true);
  assert.equal(corrected.canConfirm, true);
});


test("Scan V3 Review ne valide pas un article non identifiÃ© sans vÃ©ritable correction du libellÃ©", () => {
  const review = buildReceiptReview({
    source: "photo",
    merchant: "Maison de la viande",
    purchaseDate: "2026-09-30",
    totalAmount: 10.12,
    currency: "EUR",
    rawText: "1.445 kg x 7.00 10.12",
    discounts: [],
    items: [
      {
        label: "LIBELLE OCR INCONNU",
        quantity: 1.445,
        unit: "kg",
        unitPrice: 7,
        totalPrice: 10.12,
        confidence: 0.7,
        needsReview: true,
        labelNeedsReview: true,
      },
    ],
  });

  const corrected = applyReceiptItemCorrection(review, 0, {
    label: "LIBELLE OCR INCONNU",
    quantity: 1.445,
    unit: "kg",
    unitPrice: 7,
    totalPrice: 10.12,
  });

  assert.equal(corrected.items[0].needsReview, true);
  assert.equal(corrected.canConfirm, false);
});


test("Scan V3 Review distingue la vÃ©rification du libellÃ© de la vÃ©rification gÃ©nÃ©rale", () => {
  const receipt = normalizeReceiptExtraction({
    source: "photo",
    merchant: "Exemple",
    purchaseDate: "2026-09-30",
    totalAmount: 5,
    currency: "EUR",
    rawText: "SAVON 5.00",
    items: [
      {
        label: "SAVON",
        quantity: null,
        unit: null,
        unitPrice: null,
        totalPrice: 5,
        confidence: 0.7,
        needsReview: true,
        labelNeedsReview: false,
      },
    ],
  });

  assert.equal(receipt.items[0].needsReview, true);
  assert.equal(receipt.items[0].labelNeedsReview, false);

  const review = buildReceiptReview({
    ...receipt,
    discounts: [],
  });

  const corrected = applyReceiptItemCorrection(review, 0, {
    label: "SAVON",
    quantity: null,
    unit: null,
    unitPrice: null,
    totalPrice: 5,
  });

  assert.equal(corrected.items[0].label, "SAVON");
  assert.equal(corrected.items[0].labelNeedsReview, false);
  assert.equal(corrected.items[0].needsReview, false);
  assert.equal(corrected.canConfirm, true);
});


test("Scan V3 Review permet de valider explicitement une ligne OCR correcte sans la modifier", () => {
  const review = buildReceiptReview({
    source: "photo",
    merchant: "Exemple",
    purchaseDate: "2026-09-30",
    totalAmount: 5,
    currency: "EUR",
    rawText: "SAVON 5.00",
    discounts: [],
    items: [
      {
        label: "SAVON",
        quantity: null,
        unit: null,
        unitPrice: null,
        totalPrice: 5,
        confidence: 0.7,
        labelNeedsReview: false,
        needsReview: true,
      },
    ],
  });

  const confirmed = confirmReceiptReviewItem(review, 0);

  assert.equal(confirmed.items[0].label, "SAVON");
  assert.equal(confirmed.items[0].needsReview, false);
  assert.equal(confirmed.canConfirm, true);
});

test("Scan V3 Review interdit de valider explicitement un article dont le libellÃ© reste inconnu", () => {
  const review = buildReceiptReview({
    source: "photo",
    merchant: "Maison de la viande",
    purchaseDate: "2026-09-30",
    totalAmount: 10.12,
    currency: "EUR",
    rawText: "1.445 kg x 7.00 10.12",
    discounts: [],
    items: [
      {
        label: "Article Ã  identifier",
        quantity: 1.445,
        unit: "kg",
        unitPrice: 7,
        totalPrice: 10.12,
        confidence: 0.7,
        labelNeedsReview: true,
        needsReview: true,
      },
    ],
  });

  const confirmed = confirmReceiptReviewItem(review, 0);

  assert.equal(confirmed.items[0].labelNeedsReview, true);
  assert.equal(confirmed.items[0].needsReview, true);
  assert.equal(confirmed.canConfirm, false);
});



test("Scan V3 Review permet de corriger le total global du ticket et recalcule la cohérence", () => {
  const review = buildReceiptReview({
    source: "photo",
    merchant: "Maison Test",
    purchaseDate: "2026-09-30",
    totalAmount: 12,
    currency: "EUR",
    rawText: "ARTICLE 10.00 TOTAL 12.00",
    items: [
      {
        label: "ARTICLE",
        quantity: null,
        unit: null,
        unitPrice: null,
        totalPrice: 10,
        confidence: 0.99,
        labelNeedsReview: false,
        needsReview: false,
      },
    ],
    discounts: [],
  });

  assert.equal(review.canConfirm, false);

  const corrected = applyReceiptReviewCorrection(review, {
    totalAmount: 10,
  });

  assert.equal(corrected.totalAmount, 10);
  assert.equal(corrected.consistency.needsReview, false);
  assert.equal(corrected.canConfirm, true);
});


test("Scan V3 Review permet de corriger le commerce et la date sans inventer de valeur", () => {
  const review = buildReceiptReview({
    source: "photo",
    merchant: "",
    purchaseDate: null,
    totalAmount: 10,
    currency: "EUR",
    rawText: "ARTICLE 10.00 TOTAL 10.00",
    items: [
      {
        label: "ARTICLE",
        quantity: null,
        unit: null,
        unitPrice: null,
        totalPrice: 10,
        confidence: 0.99,
        labelNeedsReview: false,
        needsReview: false,
      },
    ],
    discounts: [],
  });

  assert.equal(review.merchant, "");
  assert.equal(review.purchaseDate, null);
  assert.equal(review.needsReview, true);
  assert.equal(review.canConfirm, false);

  const corrected = applyReceiptReviewCorrection(review, {
    merchant: "Maison de la viande",
    purchaseDate: "2026-09-30",
  });

  assert.equal(corrected.merchant, "Maison de la viande");
  assert.equal(corrected.purchaseDate, "2026-09-30");
  assert.equal(corrected.totalAmount, 10);
  assert.equal(corrected.canConfirm, true);
});


test("Scan V3 Review bloque une date d'achat impossible avant confirmation", () => {
  const review = buildReceiptReview({
    source: "photo",
    merchant: "Maison Test",
    purchaseDate: "2026-02-31",
    totalAmount: 10,
    currency: "EUR",
    rawText: "ARTICLE 10.00 TOTAL 10.00",
    items: [
      {
        label: "ARTICLE",
        quantity: null,
        unit: null,
        unitPrice: null,
        totalPrice: 10,
        confidence: 0.99,
        labelNeedsReview: false,
        needsReview: false,
      },
    ],
    discounts: [],
  });

  assert.equal(review.needsReview, true);
  assert.equal(review.canConfirm, false);
});
