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
    viewSource.indexOf("const predictions = await ocr.predict(ocrImageFile)") + 60,
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
