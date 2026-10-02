import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const componentPath = "components/DaboScanView.tsx";

test("DaboScanView utilise exclusivement le pipeline OCR Scan V3", () => {
  const source = fs.readFileSync(componentPath, "utf8");

  assert.match(
    source,
    /import \{ PaddleOCR \} from "@paddleocr\/paddleocr-js"/,
  );
  assert.match(
    source,
    /import \{[\s\S]*?buildReceiptReviewFromOcr,[\s\S]*?buildReceiptReviewFromOcrPages,[\s\S]*?\} from "@\/lib\/dabo-scan-v3-pipeline"/,
  );
  assert.match(
    source,
    /import DaboScanV3Review from "@\/components\/DaboScanV3Review"/,
  );
  assert.match(source, /PaddleOCR\.create\(/);
  assert.match(source, /prepareReceiptImageForOcr\(file\)/);
  assert.match(source, /ocr\.predict\(ocrImageFile\)/);
  assert.doesNotMatch(source, /ocr\.predict\(file\)/);
  assert.match(source, /buildReceiptReviewFromOcr\(/);
  assert.match(source, /<DaboScanV3Review/);

  assert.doesNotMatch(source, /Tesseract/);
  assert.doesNotMatch(source, /extractScan/);
});

test("DaboScanView confirme un ticket via le controller idempotent Scan V3", () => {
  const source = fs.readFileSync(componentPath, "utf8");

  assert.match(
    source,
    /createScanV3ConfirmationController/,
  );
  assert.match(
    source,
    /createClientRequestId:\s*\(\)\s*=>\s*crypto\.randomUUID\(\)/,
  );
  assert.match(source, /controller\.confirm\(/);

  assert.doesNotMatch(source, /\.from\("shopping_receipts"\)\.insert/);
  assert.doesNotMatch(source, /\.from\("shopping_items"\)\.insert/);
});

test("DaboScanView bloque la confirmation pendant la sauvegarde et expose le rÃ©sultat", () => {
  const source = fs.readFileSync(componentPath, "utf8");

  assert.match(source, /saving/);
  assert.match(source, /saved/);
  assert.match(source, /setSaving\(true\)/);
  assert.match(source, /setSaving\(false\)/);
  assert.match(source, /setSaved\(true\)/);
  assert.match(source, /onSaved\?\.\(\)/);
});
