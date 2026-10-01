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
