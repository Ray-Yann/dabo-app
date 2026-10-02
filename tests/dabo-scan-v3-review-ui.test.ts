import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const componentPath = "components/DaboScanV3Review.tsx";

test("Scan V3 Review UI impose une vÃ©rification humaine avant confirmation", () => {
  assert.equal(
    fs.existsSync(componentPath),
    true,
    "Le composant DaboScanV3Review doit exister",
  );

  const source = fs.readFileSync(componentPath, "utf8");

  assert.match(source, /ReceiptReview/);
  assert.match(source, /applyReceiptItemCorrection/);
  assert.match(source, /review\.canConfirm/);

  assert.match(source, /label/);
  assert.match(source, /quantity/);
  assert.match(source, /unit/);
  assert.match(source, /unitPrice/);
  assert.match(source, /totalPrice/);

  assert.match(source, /disabled=\{disabled \|\| !review\.canConfirm\}/);
});

test("Scan V3 Review UI ne sauvegarde pas directement dans Supabase", () => {
  assert.equal(
    fs.existsSync(componentPath),
    true,
    "Le composant DaboScanV3Review doit exister",
  );

  const source = fs.readFileSync(componentPath, "utf8");

  assert.doesNotMatch(source, /createClient/);
  assert.doesNotMatch(source, /supabase/i);
  assert.doesNotMatch(source, /shopping_items/);
  assert.doesNotMatch(source, /shopping_receipts/);
});


test("Scan V3 Review UI permet de valider explicitement une ligne OCR vÃ©rifiÃ©e", () => {
  const source = fs.readFileSync(componentPath, "utf8");

  assert.match(source, /confirmReceiptReviewItem/);
  assert.match(source, /scan_v3_validate_item/);
  assert.match(source, /item\.needsReview/);
  assert.match(source, /item\.labelNeedsReview/);
});


test("Scan V3 Review UI permet de corriger le total global du ticket", () => {
  const source = fs.readFileSync(componentPath, "utf8");

  assert.match(source, /applyReceiptReviewCorrection/);
  assert.match(source, /scan_v3_receipt_total/);
  assert.match(source, /updateReceiptTotal/);
  assert.match(source, /totalAmount/);
});


test("Scan V3 Review UI permet de corriger le commerce et la date du ticket", () => {
  const source = fs.readFileSync(componentPath, "utf8");

  assert.match(source, /scan_merchant/);
  assert.match(source, /scan_v3_purchase_date/);
  assert.match(source, /updateReceiptMerchant/);
  assert.match(source, /updateReceiptDate/);
  assert.match(source, /applyReceiptReviewCorrection/);
});


test("DaboScanV3Review peut Ãªtre verrouillÃ© pendant une sauvegarde", () => {
  const source = fs.readFileSync("components/DaboScanV3Review.tsx", "utf8");

  assert.match(source, /disabled\?:\s*boolean/);
  assert.match(source, /disabled\s*=\s*false/);
  assert.match(source, /disabled=\{disabled\}/);
});
