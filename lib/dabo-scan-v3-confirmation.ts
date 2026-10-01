import type { ReceiptReview } from "@/lib/dabo-scan-v3-review";

export type ConfirmedReceiptItem = {
  name: string;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  lineTotal: number;
};

export type ConfirmedReceiptPayload = {
  source: ReceiptReview["source"];
  merchant: string;
  purchaseDate: string;
  totalAmount: number;
  currency: string;
  rawText: string;
  adjustments: ReceiptReview["discounts"];
  items: ConfirmedReceiptItem[];
};

export function isValidPurchaseDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function buildConfirmedReceiptPayload(
  review: ReceiptReview,
): ConfirmedReceiptPayload {
  if (!isValidPurchaseDate(review.purchaseDate)) {
    throw new Error("La date d'achat doit être confirmée avant enregistrement.");
  }

  if (
    !review.canConfirm ||
    review.needsReview ||
    review.unresolvedItems > 0 ||
    review.consistency.needsReview ||
    review.totalAmount === null ||
    review.items.length === 0
  ) {
    throw new Error("Le ticket doit être entièrement confirmé avant enregistrement.");
  }

  const items = review.items.map((item) => {
    const name = item.label.trim();

    if (
      !name ||
      item.needsReview ||
      item.labelNeedsReview ||
      item.totalPrice === null
    ) {
      throw new Error("Chaque article doit être confirmé avant enregistrement.");
    }

    return {
      name,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      lineTotal: item.totalPrice,
    };
  });

  return {
    source: review.source,
    merchant: review.merchant.trim(),
    purchaseDate: review.purchaseDate,
    totalAmount: review.totalAmount,
    currency: review.currency,
    rawText: review.rawText,
    adjustments: review.discounts,
    items,
  };
}
