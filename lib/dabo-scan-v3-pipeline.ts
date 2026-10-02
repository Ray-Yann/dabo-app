import {
  reconstructReceiptLinesFromOcrGeometry,
  type ReceiptOcrGeometryItem,
} from "@/lib/dabo-scan-v3-ocr";
import {
  parseReceiptText,
  type ReceiptSource,
} from "@/lib/dabo-scan-v3";
import {
  buildReceiptReview,
  type ReceiptReview,
} from "@/lib/dabo-scan-v3-review";

export type ReceiptOcrInput = {
  source: ReceiptSource;
  rawText: string;
  items: ReceiptOcrGeometryItem[];
};

export type ReceiptOcrPageInput = {
  rawText: string;
  items: ReceiptOcrGeometryItem[];
};

export type ReceiptOcrPagesInput = {
  source: ReceiptSource;
  pages: ReceiptOcrPageInput[];
};

export function buildReceiptReviewFromOcrPages(
  input: ReceiptOcrPagesInput,
): ReceiptReview {
  const reconstructedPages = input.pages.map((page) => {
    const reconstructedLines =
      reconstructReceiptLinesFromOcrGeometry(page.items);

    const reconstructedText = reconstructedLines.join("\n").trim();

    return {
      reconstructedText,
      rawText: page.rawText.trim(),
    };
  });

  const textForParsing = reconstructedPages
    .map((page) => page.reconstructedText || page.rawText)
    .filter(Boolean)
    .join("\n");

  const rawText = reconstructedPages
    .map((page) => page.rawText)
    .filter(Boolean)
    .join("\n");

  const parsed = parseReceiptText(textForParsing);

  return buildReceiptReview({
    ...parsed,
    source: input.source,
    rawText,
  });
}

export function buildReceiptReviewFromOcr(
  input: ReceiptOcrInput,
): ReceiptReview {
  const reconstructedLines =
    reconstructReceiptLinesFromOcrGeometry(input.items);

  const reconstructedText = reconstructedLines.join("\n").trim();
  const textForParsing = reconstructedText || input.rawText.trim();

  const parsed = parseReceiptText(textForParsing);

  return buildReceiptReview({
    ...parsed,
    source: input.source,
    rawText: input.rawText,
  });
}
