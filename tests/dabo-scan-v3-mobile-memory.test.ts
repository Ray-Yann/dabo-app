import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const viewSource = fs.readFileSync("components/DaboScanView.tsx", "utf8");
const preprocessPath = "lib/dabo-scan-v3-image.ts";

test("Scan V3 prétraite les photos avant PaddleOCR pour protéger la mémoire mobile", () => {
  assert.equal(
    fs.existsSync(preprocessPath),
    true,
    "un module de prétraitement image Scan V3 doit exister",
  );

  const source = fs.readFileSync(preprocessPath, "utf8");
  assert.match(source, /MAX_OCR_IMAGE_DIMENSION/);
  assert.match(source, /createImageBitmap|Image/);
  assert.match(source, /canvas/i);
  assert.match(source, /toBlob/i);
});

test("DaboScanView n'envoie plus directement la photo originale à PaddleOCR", () => {
  assert.match(viewSource, /prepareReceiptImageForOcr/);
  assert.doesNotMatch(viewSource, /ocr\.predict\(file\)/);
  assert.match(viewSource, /ocr\.predict\([\s\S]*ocr[\s\S]*file[\s\S]*\)/i);
});

test("Scan V3 libère la photo originale avant d'initialiser PaddleOCR sur mobile", () => {
  const imageBranch = viewSource.slice(
    viewSource.indexOf("} else {", viewSource.indexOf("if (isPdf)")),
    viewSource.indexOf("const predictions = await predictReceipt(ocr, ocrImageFile)") + 70,
  );

  const prepareIndex = imageBranch.indexOf(
    "await prepareReceiptImageForOcr(file)",
  );
  const ocrIndex = imageBranch.indexOf("await getOcr()");

  assert.ok(prepareIndex >= 0, "le prétraitement image doit être présent");
  assert.ok(ocrIndex >= 0, "l'initialisation PaddleOCR doit être locale au flux image");
  assert.ok(
    prepareIndex < ocrIndex,
    "la photo doit être prétraitée avant l'initialisation de PaddleOCR",
  );
});

test("le prétraitement OCR reste distinct de l'aperçu utilisateur", () => {
  assert.match(viewSource, /URL\.createObjectURL\(next\)/);
  assert.match(viewSource, /prepareReceiptImageForOcr/);
});



test("Scan V3 limite PaddleOCR à un thread WASM pour réduire le pic mémoire mobile", () => {
  assert.match(
    viewSource,
    /ortOptions\s*:\s*\{[\s\S]*?numThreads\s*:\s*1[\s\S]*?\}/,
    "PaddleOCR doit limiter ONNX Runtime WASM à un thread sur le flux Scan V3",
  );
});


test("Scan V3 utilise les modèles PP-OCRv6 tiny pour réduire la mémoire d'initialisation mobile", () => {
  assert.match(
    viewSource,
    /textDetectionModelName\s*:\s*["']PP-OCRv6_tiny_det["']/,
    "Scan V3 doit utiliser le modèle de détection PP-OCRv6 tiny",
  );
  assert.match(
    viewSource,
    /textRecognitionModelName\s*:\s*["']PP-OCRv6_tiny_rec["']/,
    "Scan V3 doit utiliser le modèle de reconnaissance PP-OCRv6 tiny",
  );
});

test("Scan V3 distingue un échec d'initialisation OCR d'un échec de prédiction", () => {
  assert.match(
    viewSource,
    /SCAN_INIT_FAILED/,
    "Scan V3 doit identifier explicitement un échec pendant PaddleOCR.create",
  );
  assert.match(
    viewSource,
    /SCAN_PREDICT_FAILED/,
    "Scan V3 doit identifier explicitement un échec pendant ocr.predict",
  );
});
