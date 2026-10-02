import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const viewSource = fs.readFileSync("components/DaboScanView.tsx", "utf8");
const packageSource = fs.readFileSync("package.json", "utf8");

test("Scan V3 accepte les images et les tickets PDF", () => {
  assert.match(
    viewSource,
    /accept="image\/\*,application\/pdf"/,
    "le sélecteur de fichier doit accepter image/* et application/pdf",
  );

  assert.match(
    viewSource,
    /application\/pdf/,
    "DaboScanView doit reconnaître explicitement les PDF",
  );
});

test("Scan V3 distingue une photo d'un document numérique", () => {
  assert.match(
    viewSource,
    /source:\s*isPdf\s*\?\s*"digital_document"\s*:\s*"photo"/,
    "la source PDF doit être digital_document et l'image photo",
  );
});

test("les PDF sont rendus en pages avant leur passage dans PaddleOCR", () => {
  assert.match(
    viewSource,
    /renderReceiptPdfPages/,
    "DaboScanView doit utiliser le rendu PDF par pages",
  );

  assert.match(
    packageSource,
    /"pdfjs-dist"/,
    "pdfjs-dist doit être une dépendance du projet",
  );
});

test("le PDF ne contourne pas la review humaine Scan V3", () => {
  assert.match(viewSource, /DaboScanV3Review/);
  assert.match(viewSource, /onConfirm=/);
  assert.doesNotMatch(
    viewSource,
    /dabo_record_shopping_session_expense/,
    "le Scan V3 ne doit jamais créer directement une transaction Finance",
  );
});
