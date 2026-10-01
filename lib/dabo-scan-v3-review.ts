import {
  validateReceiptConsistency,
  type ParsedReceiptText,
  type ReceiptConsistency,
  type ReceiptItem,
} from "@/lib/dabo-scan-v3";
import { isValidPurchaseDate } from "@/lib/dabo-scan-v3-confirmation";

export type ReceiptReview = {
  source: ParsedReceiptText["source"];
  merchant: string;
  purchaseDate: string | null;
  totalAmount: number | null;
  currency: string;
  rawText: string;
  items: ReceiptItem[];
  discounts: ParsedReceiptText["discounts"];
  unresolvedItems: number;
  consistency: ReceiptConsistency;
  needsReview: boolean;
  canConfirm: boolean;
};

export function buildReceiptReview(
  receipt: ParsedReceiptText,
): ReceiptReview {
  const unresolvedItems = receipt.items.filter(
    (item) => item.needsReview,
  ).length;

  const consistency = validateReceiptConsistency(receipt);

  const needsReview =
    receipt.items.length === 0 ||
    unresolvedItems > 0 ||
    receipt.merchant.trim().length === 0 ||
    !isValidPurchaseDate(receipt.purchaseDate) ||
    receipt.totalAmount === null ||
    consistency.needsReview;

  return {
    source: receipt.source,
    merchant: receipt.merchant,
    purchaseDate: receipt.purchaseDate,
    totalAmount: receipt.totalAmount,
    currency: receipt.currency,
    rawText: receipt.rawText,
    items: receipt.items,
    discounts: receipt.discounts,
    unresolvedItems,
    consistency,
    needsReview,
    canConfirm: !needsReview,
  };
}


export type ReceiptReviewCorrection = {
  merchant?: string;
  purchaseDate?: string | null;
  totalAmount?: number | null;
};

export function applyReceiptReviewCorrection(
  review: ReceiptReview,
  correction: ReceiptReviewCorrection,
): ReceiptReview {
  const merchant =
    correction.merchant === undefined
      ? review.merchant
      : correction.merchant.trim();

  const purchaseDate =
    correction.purchaseDate === undefined
      ? review.purchaseDate
      : correction.purchaseDate;

  const totalAmount =
    correction.totalAmount === undefined
      ? review.totalAmount
      : correction.totalAmount;

  return buildReceiptReview({
    source: review.source,
    merchant,
    purchaseDate,
    totalAmount,
    currency: review.currency,
    rawText: review.rawText,
    items: review.items,
    discounts: review.discounts,
  });
}


export type ReceiptItemCorrection = {
  label: string;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  totalPrice: number | null;
};

export function confirmReceiptReviewItem(
  review: ReceiptReview,
  itemIndex: number,
): ReceiptReview {
  if (
    !Number.isInteger(itemIndex) ||
    itemIndex < 0 ||
    itemIndex >= review.items.length
  ) {
    throw new RangeError("Invalid receipt item index");
  }

  const item = review.items[itemIndex];

  return applyReceiptItemCorrection(review, itemIndex, {
    label: item.label,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
  });
}


export function applyReceiptItemCorrection(
  review: ReceiptReview,
  itemIndex: number,
  correction: ReceiptItemCorrection,
): ReceiptReview {
  if (
    !Number.isInteger(itemIndex) ||
    itemIndex < 0 ||
    itemIndex >= review.items.length
  ) {
    throw new RangeError("Invalid receipt item index");
  }

  const label = correction.label.trim();
  const hasLineTotal =
    correction.totalPrice !== null &&
    correction.totalPrice >= 0;
  const hasNoUnitMath =
    correction.quantity === null &&
    correction.unitPrice === null;
  const hasValidUnitMath =
    correction.quantity !== null &&
    correction.quantity > 0 &&
    correction.unitPrice !== null &&
    correction.unitPrice >= 0 &&
    correction.totalPrice !== null &&
    Math.abs(
      Math.round(correction.quantity * correction.unitPrice * 100) / 100 -
        correction.totalPrice
    ) <= 0.01;
  const hasValidMath =
    hasLineTotal &&
    (hasNoUnitMath || hasValidUnitMath);

  const currentItem = review.items[itemIndex];
  const normalizedPreviousLabel = currentItem.label.trim().toLocaleLowerCase();
  const normalizedCorrectedLabel = label.toLocaleLowerCase();
  const labelIsResolved =
    label.length > 0 &&
    (!currentItem.labelNeedsReview ||
      normalizedCorrectedLabel !== normalizedPreviousLabel);

  const isComplete =
    labelIsResolved &&
    hasValidMath;

  const items = review.items.map((item, index) =>
    index === itemIndex
      ? {
          ...item,
          label,
          quantity: correction.quantity,
          unit: correction.unit?.trim() || null,
          unitPrice: correction.unitPrice,
          totalPrice: correction.totalPrice,
          labelNeedsReview: currentItem.labelNeedsReview && !labelIsResolved,
          needsReview: !isComplete,
        }
      : item,
  );

  return buildReceiptReview({
    source: review.source,
    merchant: review.merchant,
    purchaseDate: review.purchaseDate,
    totalAmount: review.totalAmount,
    currency: review.currency,
    rawText: review.rawText,
    items,
    discounts: review.discounts,
  });
}
