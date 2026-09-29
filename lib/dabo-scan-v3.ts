export type ReceiptSource = "photo" | "digital_document";

export type ReceiptItemInput = {
  label: string;
  quantity?: number | null;
  unit?: string | null;
  unitPrice?: number | null;
  totalPrice?: number | null;
  confidence?: number | null;
};

export type ReceiptItem = {
  label: string;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  totalPrice: number | null;
  confidence: number | null;
  needsReview: boolean;
};

export type ReceiptExtractionInput = {
  source: ReceiptSource;
  merchant?: string | null;
  purchaseDate?: string | null;
  totalAmount?: number | null;
  currency?: string | null;
  rawText?: string | null;
  items?: ReceiptItemInput[];
};

export type ReceiptExtraction = {
  source: ReceiptSource;
  merchant: string;
  purchaseDate: string | null;
  totalAmount: number | null;
  currency: string;
  rawText: string;
  items: ReceiptItem[];
};

export type ReceiptConsistency = {
  isConsistent: boolean;
  needsReview: boolean;
  itemsTotal: number;
  adjustmentsTotal: number;
  calculatedTotal: number;
  difference: number;
};

const REVIEW_CONFIDENCE_THRESHOLD = 0.85;
const MONEY_TOLERANCE = 0.01;

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function normalizeReceiptExtraction(
  input: ReceiptExtractionInput,
): ReceiptExtraction {
  return {
    source: input.source,
    merchant: input.merchant?.trim() ?? "",
    purchaseDate: input.purchaseDate ?? null,
    totalAmount:
      typeof input.totalAmount === "number"
        ? roundMoney(input.totalAmount)
        : null,
    currency: input.currency?.trim().toUpperCase() || "EUR",
    rawText: input.rawText ?? "",
    items: (input.items ?? []).map((item) => {
      const confidence =
        typeof item.confidence === "number" ? item.confidence : null;

      return {
        label: item.label.trim(),
        quantity: item.quantity ?? null,
        unit: item.unit?.trim() || null,
        unitPrice:
          typeof item.unitPrice === "number"
            ? roundMoney(item.unitPrice)
            : null,
        totalPrice:
          typeof item.totalPrice === "number"
            ? roundMoney(item.totalPrice)
            : null,
        confidence,
        needsReview:
          confidence === null ||
          confidence < REVIEW_CONFIDENCE_THRESHOLD,
      };
    }),
  };
}

export function validateReceiptConsistency(
  receipt: ReceiptExtraction & {
    discounts?: Array<{ amount: number }>;
  },
): ReceiptConsistency {
  const itemsTotal = roundMoney(
    receipt.items.reduce(
      (sum, item) =>
        sum + (typeof item.totalPrice === "number" ? item.totalPrice : 0),
      0,
    ),
  );

  const adjustmentsTotal = roundMoney(
    (receipt.discounts ?? []).reduce(
      (sum, discount) =>
        sum + (typeof discount.amount === "number" ? discount.amount : 0),
      0,
    ),
  );

  const calculatedTotal = roundMoney(itemsTotal + adjustmentsTotal);

  if (receipt.totalAmount === null) {
    return {
      isConsistent: false,
      needsReview: true,
      itemsTotal,
      adjustmentsTotal,
      calculatedTotal,
      difference: 0,
    };
  }

  const difference = roundMoney(
    Math.abs(receipt.totalAmount - calculatedTotal),
  );

  const hasIncompleteLine = receipt.items.some(
    (item) => item.totalPrice === null || item.needsReview,
  );

  const isConsistent =
    receipt.items.length > 0 &&
    !hasIncompleteLine &&
    difference <= MONEY_TOLERANCE;

  return {
    isConsistent,
    needsReview: !isConsistent,
    itemsTotal,
    adjustmentsTotal,
    calculatedTotal,
    difference,
  };
}

export type ReceiptDiscount = {
  label: string;
  amount: number;
};

export type ParsedReceiptText = ReceiptExtraction & {
  discounts: ReceiptDiscount[];
};

function parseReceiptNumber(value: string): number {
  return Number(value.replace(/\s/g, "").replace(",", "."));
}

function cleanReceiptLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeOcrMoneyConfusions(text: string): string {
  return text.replace(
    /\b(\d+[.,]\d*[Oo]|\d+[Oo][.,]\d+)\b/g,
    (token) => token.replace(/[Oo]/g, "0"),
  );
}

function parseEuropeanReceiptDate(text: string): string | null {
  const match = text.match(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})\b/);

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

export function parseReceiptText(rawText: string): ParsedReceiptText {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => normalizeOcrMoneyConfusions(line.trim()))
    .filter(Boolean);

  const items: ReceiptItemInput[] = [];
  const discounts: ReceiptDiscount[] = [];
  let totalAmount: number | null = null;

  const merchant =
    lines.find(
      (line) =>
        /[A-Za-zÀ-ÿ]/.test(line) &&
        !parseEuropeanReceiptDate(line) &&
        !/\d+[.,]\d{1,2}\s*(?:€|EUR)?$/i.test(line),
    ) ?? null;

  const purchaseDate =
    lines.map(parseEuropeanReceiptDate).find((date) => date !== null) ?? null;

  const money = String.raw`-?\d+(?:[.,]\d{2})`;

  const totalPattern = new RegExp(
    String.raw`^(?:TOTAL|TOTAAL|À PAYER|A PAYER|TE BETALEN|AMOUNT DUE)\s+(${money})\s*(?:€|EUR)?$`,
    "i",
  );

  const discountPattern = new RegExp(
    String.raw`^((?:PROMO|REMISE|REDUCTION|RÉDUCTION|KORTING|DISCOUNT)\b.*?)\s+(-\d+(?:[.,]\d{2}))\s*(?:€|EUR)?$`,
    "i",
  );

  const weightedPattern = new RegExp(
    String.raw`^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(kg|g)\s*[x×]\s*(\d+(?:[.,]\d{2}))\s*(?:€\/?(?:kg|g))?\s+(\d+(?:[.,]\d{2}))\s*(?:€|EUR)?$`,
    "i",
  );

  const multipliedPattern = new RegExp(
    String.raw`^(.+?)\s+(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d{2}))\s+(\d+(?:[.,]\d{2}))\s*(?:€|EUR)?$`,
    "i",
  );

  const simplePattern = new RegExp(
    String.raw`^(.+?)\s+(\d+(?:[.,]\d{2}))\s*(?:€|EUR)?$`,
    "i",
  );

  const nonItemPattern =
    /^(?:SOUS[- ]?TOTAL|SUBTOTAL|SUB[- ]?TOTAL|SUBTOTAAL|TUSSENTOTAAL|TVA|VAT|BTW|BANCONTACT|BANCONTANT|CARTE|CARD|BANKKAART|PIN|MAESTRO|MASTERCARD|VISA)(?:\b|\s|:)/i;

  let pendingDescription: string | null = null;
  let headerConsumed = false;

  const withPendingDescription = (label: string): string => {
    const currentLabel = cleanReceiptLabel(label);

    if (!pendingDescription) {
      return currentLabel;
    }

    const combined = cleanReceiptLabel(
      pendingDescription + " " + currentLabel,
    );

    pendingDescription = null;
    return combined;
  };

  const dateLikePattern = /\b\d{1,2}[/.\-]\d{1,2}[/.\-]\d{4}\b/;

  for (const line of lines) {
    if (parseEuropeanReceiptDate(line) || dateLikePattern.test(line)) {
      pendingDescription = null;
      continue;
    }

    if (nonItemPattern.test(line)) {
      pendingDescription = null;
      continue;
    }

    const totalMatch = line.match(totalPattern);

    if (totalMatch) {
      totalAmount = roundMoney(parseReceiptNumber(totalMatch[1]));
      continue;
    }

    const discountMatch = line.match(discountPattern);

    if (discountMatch) {
      discounts.push({
        label: cleanReceiptLabel(discountMatch[1]),
        amount: roundMoney(parseReceiptNumber(discountMatch[2])),
      });
      continue;
    }

    const genericNegativeAdjustmentMatch = line.match(
      /^(.+?)\s+(-\d+(?:[.,]\d{2}))\s*(?:€|EUR)?$/i,
    );

    if (genericNegativeAdjustmentMatch) {
      discounts.push({
        label: cleanReceiptLabel(genericNegativeAdjustmentMatch[1]),
        amount: roundMoney(
          parseReceiptNumber(genericNegativeAdjustmentMatch[2]),
        ),
      });
      continue;
    }

    const weightedMatch = line.match(weightedPattern);

    if (weightedMatch) {
      items.push({
        label: withPendingDescription(weightedMatch[1]),
        quantity: parseReceiptNumber(weightedMatch[2]),
        unit: weightedMatch[3].toLowerCase(),
        unitPrice: roundMoney(parseReceiptNumber(weightedMatch[4])),
        totalPrice: roundMoney(parseReceiptNumber(weightedMatch[5])),
        confidence: 1,
      });
      continue;
    }

    const multipliedMatch = line.match(multipliedPattern);

    if (multipliedMatch) {
      items.push({
        label: withPendingDescription(multipliedMatch[1]),
        quantity: parseReceiptNumber(multipliedMatch[2]),
        unit: "piece",
        unitPrice: roundMoney(parseReceiptNumber(multipliedMatch[3])),
        totalPrice: roundMoney(parseReceiptNumber(multipliedMatch[4])),
        confidence: 1,
      });
      continue;
    }

    const implicitQuantityMatch = line.match(
      /^(.+?)\s+(\d+)\s+(\d+[.,]\d{1,2})\s+(\d+[.,]\d{1,2})\s*(?:€|EUR)?$/i,
    );

    if (implicitQuantityMatch) {
      const quantity = Number(implicitQuantityMatch[2]);
      const unitPrice = roundMoney(
        parseReceiptNumber(implicitQuantityMatch[3]),
      );
      const totalPrice = roundMoney(
        parseReceiptNumber(implicitQuantityMatch[4]),
      );
      const expectedTotal = roundMoney(quantity * unitPrice);

      if (Math.abs(expectedTotal - totalPrice) <= MONEY_TOLERANCE) {
        items.push({
          label: withPendingDescription(implicitQuantityMatch[1]),
          quantity,
          unit: "piece",
          unitPrice,
          totalPrice,
          confidence: 1,
        });
        continue;
      }
    }

    const simpleMatch = line.match(simplePattern);

    if (simpleMatch) {
      items.push({
        label: withPendingDescription(simpleMatch[1]),
        quantity: 1,
        unit: "piece",
        unitPrice: roundMoney(parseReceiptNumber(simpleMatch[2])),
        totalPrice: roundMoney(parseReceiptNumber(simpleMatch[2])),
        confidence: 1,
      });
      continue;
    }

    if (!headerConsumed && items.length === 0) {
      headerConsumed = true;
      continue;
    }

    if (items.length === 0 && pendingDescription === null) {
      pendingDescription = cleanReceiptLabel(line);
    }
  }

  return {
    ...normalizeReceiptExtraction({
      source: "digital_document",
      merchant,
      purchaseDate,
      totalAmount,
      currency: "EUR",
      rawText,
      items,
    }),
    discounts,
  };
}
