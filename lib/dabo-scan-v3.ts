export type ReceiptSource = "photo" | "digital_document";

export type ReceiptItemInput = {
  label: string;
  quantity?: number | null;
  unit?: string | null;
  unitPrice?: number | null;
  totalPrice?: number | null;
  confidence?: number | null;
  needsReview?: boolean;
  labelNeedsReview?: boolean;
};

export type ReceiptItem = {
  label: string;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  totalPrice: number | null;
  confidence: number | null;
  needsReview: boolean;
  labelNeedsReview: boolean;
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

const NON_ITEM_LINE_PATTERN =
  /^(?:MONTANT\s+TOTAL\s+HT|TOTAL\s+HT|SOUS[- ]?TOTAL|SUBTOTAL|SUB[- ]?TOTAL|SUBTOTAAL|TUSSENTOTAAL|TVA|VAT|BTW|BANCONTACT|BANCONTANT|CARTE|CARD|BANKKAART|PIN|MAESTRO|MASTERCARD|VISA|WORLDLINE|PAIEMENT|PAYMENT|BETALING|SANS\s+CONTACT|CONTACTLESS|M[ÉE]THODE\s+DE\s+LECTURE|READ\s+METHOD|LEESMETHODE|RENDU|TERUG|ANCIEN\s+SOLDE\s+DE\s+POINTS|NOUVEAU\s+SOLDE\s+DE\s+POINTS|\d+\s+POINTS?\s+SUR\s+MONTANT\s+DES\s+ACHATS|\d+\s+TOTAL\s+POINTS?\s+TICKET)(?:\b|\s|:|\/)/i;

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function reconstructAlternatingPriceDescriptionSequence(
  lines: string[],
  totalAmount: number | null,
): ReceiptItemInput[] | null {
  if (totalAmount === null) {
    return null;
  }

  const standaloneMoneyPattern =
    /^(-?\d+(?:[.,]\d{2}))\s*(?:€|EUR)?(?:\s*[A-Z])?$/i;
  const totalLinePattern =
    /^(?:TOTAL(?:\s+TTC)?|MONTANT\s+TOTAL\s+TTC|TOTAAL|TOTA\(A\)L|À PAYER|A PAYER|TE BETALEN|AMOUNT DUE|MONTANT)(?:\s*:?\s*-?\d+(?:[.,]\d{2})\s*(?:€|EUR)?)?$/i;

  for (let start = 0; start < lines.length - 4; start += 1) {
    const firstPriceMatch = lines[start].match(standaloneMoneyPattern);

    if (!firstPriceMatch) {
      continue;
    }

    const candidateItems: ReceiptItemInput[] = [];
    let cursor = start;
    let candidateTotal = 0;

    while (cursor + 1 < lines.length) {
      const priceMatch = lines[cursor].match(standaloneMoneyPattern);

      if (!priceMatch) {
        break;
      }

      const description = lines[cursor + 1];

      if (
        !/[A-Za-zÀ-ÿ]/.test(description) ||
        totalLinePattern.test(description) ||
        NON_ITEM_LINE_PATTERN.test(description)
      ) {
        break;
      }

      const price = roundMoney(parseReceiptNumber(priceMatch[1]));

      candidateItems.push({
        label: cleanReceiptLabel(description),
        quantity: 1,
        unit: "piece",
        unitPrice: price,
        totalPrice: price,
        confidence: 1,
      });

      candidateTotal = roundMoney(candidateTotal + price);
      cursor += 2;
    }

    if (
      candidateItems.length >= 2 &&
      Math.abs(candidateTotal - totalAmount) <= MONEY_TOLERANCE
    ) {
      return candidateItems;
    }
  }

  return null;
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
          item.needsReview === true ||
          confidence === null ||
          confidence < REVIEW_CONFIDENCE_THRESHOLD,
        labelNeedsReview: item.labelNeedsReview === true,
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

  const hasIncompleteLine = receipt.items.some((item) => {
    if (item.totalPrice === null || item.needsReview) {
      return true;
    }

    const hasQuantity = item.quantity !== null;
    const hasUnitPrice = item.unitPrice !== null;

    if (hasQuantity !== hasUnitPrice) {
      return true;
    }

    if (
      item.quantity !== null &&
      item.unitPrice !== null &&
      Math.abs(
        roundMoney(item.quantity * item.unitPrice) - item.totalPrice
      ) > MONEY_TOLERANCE
    ) {
      return true;
    }

    return false;
  });

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
  const numericMatch = text.match(
    /\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})\b/,
  );
  const textualMatch = text.match(
    /\b(\d{4})-(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)-(\d{1,2})\b/i,
  );
  const dayFirstTextualMatch = text.match(
    /\b(\d{1,2})[/.\-](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[/.\-](\d{2}|\d{4})\b/i,
  );

  let day: number;
  let month: number;
  let year: number;

  if (numericMatch) {
    day = Number(numericMatch[1]);
    month = Number(numericMatch[2]);
    const parsedYear = Number(numericMatch[3]);
    year =
      numericMatch[3].length === 2 ? 2000 + parsedYear : parsedYear;
  } else if (textualMatch) {
    const monthNumbers: Record<string, number> = {
      jan: 1,
      feb: 2,
      mar: 3,
      apr: 4,
      may: 5,
      jun: 6,
      jul: 7,
      aug: 8,
      sep: 9,
      oct: 10,
      nov: 11,
      dec: 12,
    };

    year = Number(textualMatch[1]);
    month = monthNumbers[textualMatch[2].toLowerCase()];
    day = Number(textualMatch[3]);
  } else if (dayFirstTextualMatch) {
    const monthNumbers: Record<string, number> = {
      jan: 1,
      feb: 2,
      mar: 3,
      apr: 4,
      may: 5,
      jun: 6,
      jul: 7,
      aug: 8,
      sep: 9,
      oct: 10,
      nov: 11,
      dec: 12,
    };

    day = Number(dayFirstTextualMatch[1]);
    month = monthNumbers[dayFirstTextualMatch[2].toLowerCase()];
    const parsedYear = Number(dayFirstTextualMatch[3]);
    year =
      dayFirstTextualMatch[3].length === 2 ? 2000 + parsedYear : parsedYear;
  } else {
    return null;
  }

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

  const purchaseDate =
    lines.map(parseEuropeanReceiptDate).find((date) => date !== null) ?? null;

  const paymentSignalPattern =
    /^(?:PAIEMENT|PAYMENT|BETALING|DEBIT|DÉBIT|CARTE|CARD|MASTERCARD|VISA|BANCONTACT|WORLDLINE)(?:\b|\s|:)/i;

  const paymentSignalCount = lines.filter((line) =>
    paymentSignalPattern.test(line),
  ).length;
  const isPaymentReceipt = paymentSignalCount >= 2;

  const merchantMetadataPattern =
    /^(?:TOTAL|TOTAAL|TOTA\(A\)L|SOUS[- ]?TOTAL|SUBTOTAL|TICKET(?:\s+CLIENT)?|COPIE\s+(?:MARCHAND|CLIENT)|MERCI(?:\b|\s)|THANK(?:\s+YOU)?\b|BEDANKT\b|PAIEMENT|PAYMENT|BETALING|BANCONTACT|WORLDLINE|SANS\s+CONTACT|CONTACTLESS|TERMINAL\s*:|MARCHAND\s*:|TRANSACTION\s*:|P[ÉE]RIODE\s*:|CODE\s+D['’]?AUTOR|NUM\.?\s*SEQ\.?\s*CARTE|VALIDE\s+JUSQUE|V[ÉE]RIFI[ÉE]|VERIFIE)(?:\b|\s|:)/i;

  const isMerchantCandidate = (line: string) =>
    /[A-Za-zÀ-ÿ]/.test(line) &&
    !parseEuropeanReceiptDate(line) &&
    !/\d+[.,]\d{1,2}\s*(?:€|EUR)?$/i.test(line) &&
    !merchantMetadataPattern.test(line) &&
    !/^\d{4}\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .'-]+$/.test(line);

  let merchant: string | null = null;

  if (isPaymentReceipt) {
    const postalAddressIndex = lines.findIndex((line) =>
      /^\d{4}\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .'-]+$/.test(line),
    );

    if (
      postalAddressIndex > 0 &&
      isMerchantCandidate(lines[postalAddressIndex - 1])
    ) {
      merchant = lines[postalAddressIndex - 1];
    }
  }

  merchant ??= lines.find(isMerchantCandidate) ?? null;

  const money = String.raw`-?\d+(?:[.,]\d{2})`;

  const totalPattern = new RegExp(
    String.raw`^(?:TOTAL ARRONDI|AFGEROND TOTAAL|TOTAAL AFGEROND|ROUNDED TOTAL|TOTAL ROUNDED|TOTAL|TOTAAL|TOTA\(A\)L|À PAYER|A PAYER|TE BETALEN|AMOUNT DUE|MONTANT)\s+(${money})\s*(?:€|EUR)?$`,
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

  const unlabeledWeightedPattern = new RegExp(
    String.raw`^(\d+(?:[.,]\d+)?)\s*(kg|g)\s*[x×]\s*(\d+(?:[.,]\d{2}))\s*(?:€\/?(?:kg|g))?\s+(\d+(?:[.,]\d{2}))\s*(?:€|EUR)?$`,
    "i",
  );

  const multipliedPattern = new RegExp(
    String.raw`^(.+?)\s+(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d{2}))\s+(\d+(?:[.,]\d{2}))\s*(?:€|EUR)?$`,
    "i",
  );

  const unlabeledPiecePattern = new RegExp(
    String.raw`^(\d+(?:[.,]\d+)?)\s*(?:st|pc|pcs|piece|pieces|pièce|pièces)?\s*[x×]\s*(\d+(?:[.,]\d{2}))\s+(\d+(?:[.,]\d{2}))\s*(?:€|EUR)?$`,
    "i",
  );

  const simplePattern = new RegExp(
    String.raw`^(.+?)\s+(\d+(?:[.,]\d{2}))\s*(?:€|EUR)?$`,
    "i",
  );


  let pendingDescription: string | null = null;
  let pendingTotalLinesRemaining = 0;
  let pendingDiscountLabel: string | null = null;
  let pendingQuantity: number | null = null;
  let pendingPrefixedQuantity = false;
  let pendingUnitPrice: number | null = null;
  let pendingStandalonePrices: number[] = [];
  let previousStandalonePaymentAmount: number | null = null;
  let headerConsumed = false;

  const standaloneMoneyPattern =
    /^(-?\d+(?:[.,]\d{2}))\s*(?:€|EUR)?(?:\s*[A-Z])?$/i;
  const standaloneQuantityPattern = /^\d+(?:[.,]\d+)?$/;
  const barcodePattern = /^\d{7,14}$/;
  const discountLabelPattern =
    /^(?:PROMO|REMISE|REDUCTION|RÉDUCTION|KORTING|DISCOUNT|ARRONDI|AFRONDING|ROUNDING)\b/i;
  const ignoredStandalonePattern =
    /^(?:DESCRIPTION|ARTICLES?|ARTIKEL|PRIJS|TOTAAL|TOTA\(A\)L|EUR|€|VERKOOP|QTÉ.*|QTE.*)$/i;

  const flushForwardItem = (price: number): boolean => {
    if (!pendingDescription) {
      return false;
    }

    items.push({
      label: cleanReceiptLabel(pendingDescription),
      quantity: pendingQuantity ?? 1,
      unit: "piece",
      unitPrice:
        pendingUnitPrice ??
        (pendingQuantity !== null && pendingQuantity !== 1 ? null : price),
      totalPrice: price,
      confidence: 1,
    });

    pendingDescription = null;
    pendingQuantity = null;
    pendingPrefixedQuantity = false;
    pendingUnitPrice = null;
    pendingStandalonePrices = [];
    return true;
  };

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
    if (pendingTotalLinesRemaining > 0) {
      const standaloneTotal = line.match(
        /^(-?\d+(?:[.,]\d{2}))\s*(?:€|EUR)?$/i,
      );

      if (standaloneTotal) {
        totalAmount = roundMoney(parseReceiptNumber(standaloneTotal[1]));
        pendingTotalLinesRemaining = 0;
        pendingDescription = null;
        continue;
      }

      pendingTotalLinesRemaining -= 1;
    }

    const totalLabelMatch = line.match(
      /^(TOTAL(?:\s+TTC)?|MONTANT\s+TOTAL\s+TTC|TOTAAL|TOTA\(A\)L|À PAYER|A PAYER|TE BETALEN|AMOUNT DUE|MONTANT)\s*:?$/i,
    );

    if (totalLabelMatch) {
      const normalizedTotalLabel = totalLabelMatch[1].toUpperCase();

      if (isPaymentReceipt && previousStandalonePaymentAmount !== null) {
        totalAmount = previousStandalonePaymentAmount;
        pendingTotalLinesRemaining = 0;
        previousStandalonePaymentAmount = null;
        pendingDescription = null;
        continue;
      }

      if ((normalizedTotalLabel === "TOTAAL" || normalizedTotalLabel === "TOTA(A)L") && items.length === 0) {
        pendingTotalLinesRemaining = 0;
      } else {
        pendingTotalLinesRemaining = isPaymentReceipt ? 16 : 6;
      }

      pendingDescription = null;
      continue;
    }

    if (parseEuropeanReceiptDate(line) || dateLikePattern.test(line)) {
      pendingDescription = null;
      continue;
    }

    if (NON_ITEM_LINE_PATTERN.test(line)) {
      pendingDescription = null;
      pendingDiscountLabel = null;
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

    const unlabeledWeightedMatch = line.match(unlabeledWeightedPattern);

    if (unlabeledWeightedMatch) {
      items.push({
        label: "Article à identifier",
        labelNeedsReview: true,
        quantity: parseReceiptNumber(unlabeledWeightedMatch[1]),
        unit: unlabeledWeightedMatch[2].toLowerCase(),
        unitPrice: roundMoney(parseReceiptNumber(unlabeledWeightedMatch[3])),
        totalPrice: roundMoney(parseReceiptNumber(unlabeledWeightedMatch[4])),
        confidence: 1,
        needsReview: true,
      });
      continue;
    }

    const unlabeledPieceMatch = line.match(unlabeledPiecePattern);

    if (unlabeledPieceMatch) {
      items.push({
        label: "Article à identifier",
        labelNeedsReview: true,
        quantity: parseReceiptNumber(unlabeledPieceMatch[1]),
        unit: null,
        unitPrice: roundMoney(parseReceiptNumber(unlabeledPieceMatch[2])),
        totalPrice: roundMoney(parseReceiptNumber(unlabeledPieceMatch[3])),
        confidence: 1,
        needsReview: true,
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

    const inlineRoundingMatch = line.match(
      /^(ARRONDI|AFRONDING|ROUNDING)\s+([+-]?\d+(?:[.,]\d{2}))\s*(?:€|EUR)?$/i,
    );

    if (inlineRoundingMatch) {
      discounts.push({
        label: cleanReceiptLabel(inlineRoundingMatch[1]),
        amount: roundMoney(parseReceiptNumber(inlineRoundingMatch[2])),
      });
      pendingDescription = null;
      continue;
    }

    const inlineSubtotalMatch = line.match(
      /^(?:SOUS[ -]?TOTAL|SOUSTOT|SUBTOTAL|SUB[ -]?TOTAL)\s+\d+(?:[.,]\d{2})\s*(?:€|EUR)?$/i,
    );

    if (inlineSubtotalMatch) {
      pendingDescription = null;
      continue;
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

    if (discountLabelPattern.test(line)) {
      pendingDiscountLabel = cleanReceiptLabel(line);
      pendingDescription = null;
      continue;
    }

    const standaloneMoneyMatch = line.match(standaloneMoneyPattern);

    if (standaloneMoneyMatch) {
      const amount = roundMoney(parseReceiptNumber(standaloneMoneyMatch[1]));
      const isUnitPriceMarker = /\bx\s*$/i.test(line);

      if (isPaymentReceipt && amount >= 0) {
        previousStandalonePaymentAmount = amount;
      }

      if (
        isUnitPriceMarker &&
        amount >= 0 &&
        pendingDescription &&
        pendingUnitPrice === null
      ) {
        pendingUnitPrice = amount;
        continue;
      }

      if (pendingDiscountLabel) {
        discounts.push({
          label: pendingDiscountLabel,
          amount,
        });
        pendingDiscountLabel = null;
        continue;
      }

      if (amount < 0) {
        pendingDiscountLabel = null;
        continue;
      }

      if (pendingDescription) {
        if (pendingUnitPrice !== null) {
          flushForwardItem(amount);
          continue;
        }

        if (pendingQuantity !== null && pendingPrefixedQuantity) {
          flushForwardItem(amount);
          continue;
        }

        if (pendingQuantity !== null) {
          pendingUnitPrice = amount;
          continue;
        }

        flushForwardItem(amount);
        continue;
      }

      pendingStandalonePrices.push(amount);
      continue;
    }

    if (barcodePattern.test(line)) {
      continue;
    }

    if (standaloneQuantityPattern.test(line)) {
      const quantity = parseReceiptNumber(line);

      if (pendingDescription) {
        pendingQuantity = quantity;
      } else if (pendingStandalonePrices.length === 0) {
        pendingQuantity = quantity;
      }

      continue;
    }

    if (ignoredStandalonePattern.test(line) || /^\*+.*\*+$/.test(line)) {
      pendingDescription = null;
      pendingQuantity = null;
      pendingUnitPrice = null;
      pendingStandalonePrices = [];
      continue;
    }

    if (
      pendingStandalonePrices.length >= 2 &&
      pendingQuantity !== null &&
      /[A-Za-zÀ-ÿ]/.test(line)
    ) {
      const unitPrice = pendingStandalonePrices[0];
      const totalPrice = pendingStandalonePrices[1];

      items.push({
        label: cleanReceiptLabel(line),
        quantity: pendingQuantity,
        unit: "piece",
        unitPrice,
        totalPrice,
        confidence: 1,
      });

      pendingDescription = null;
      pendingQuantity = null;
      pendingUnitPrice = null;
      pendingStandalonePrices = [];
      continue;
    }

    if (
      pendingStandalonePrices.length === 1 &&
      pendingQuantity === null &&
      pendingDescription === null &&
      /[A-Za-zÀ-ÿ]/.test(line) &&
      !NON_ITEM_LINE_PATTERN.test(line) &&
      !dateLikePattern.test(line) &&
      line !== merchant &&
      !/^(?:TOTAL|TOTAAL|TOTA\(A\)L|TICKET|PAIEMENT|PAYMENT|BETALING|DEBIT|DÉBIT|CARTE|CARD|WORLDLINE|RENDU|TERUG|ANCIEN|NOUVEAU|POINTS?\b)/i.test(line)
    ) {
      const price = pendingStandalonePrices[0];

      items.push({
        label: cleanReceiptLabel(line),
        quantity: 1,
        unit: "piece",
        unitPrice: price,
        totalPrice: price,
        confidence: 1,
      });

      pendingStandalonePrices = [];
      headerConsumed = true;
      continue;
    }

    if (
      /[A-Za-zÀ-ÿ]/.test(line) &&
      !NON_ITEM_LINE_PATTERN.test(line) &&
      !dateLikePattern.test(line) &&
      line !== merchant
    ) {
      const prefixedQuantityMatch = line.match(
        /^(\d+(?:[.,]\d+)?)\s+(.+?[A-Za-zÀ-ÿ].*)$/,
      );

      if (prefixedQuantityMatch) {
        pendingQuantity = parseReceiptNumber(prefixedQuantityMatch[1]);
        pendingPrefixedQuantity = true;
        pendingDescription = cleanReceiptLabel(prefixedQuantityMatch[2]);
        pendingUnitPrice = null;
        pendingStandalonePrices = [];
        headerConsumed = true;
        continue;
      }

      if (pendingDescription && pendingQuantity !== null) {
        pendingDescription = cleanReceiptLabel(
          pendingDescription + " " + line,
        );
        headerConsumed = true;
        continue;
      }

      pendingDescription = cleanReceiptLabel(line);
      pendingQuantity = null;
      pendingUnitPrice = null;
      pendingStandalonePrices = [];
      headerConsumed = true;
      continue;
    }

    if (!headerConsumed && items.length === 0) {
      headerConsumed = true;
    }
  }

  const alternatingItems =
    reconstructAlternatingPriceDescriptionSequence(lines, totalAmount);

  const resolvedItems = (alternatingItems ?? items).filter(
    (item) => item.quantity === null || item.quantity === undefined || item.quantity > 0,
  );

  return {
    ...normalizeReceiptExtraction({
      source: "digital_document",
      merchant,
      purchaseDate,
      totalAmount,
      currency: "EUR",
      rawText,
      items: resolvedItems,
    }),
    discounts,
  };
}
