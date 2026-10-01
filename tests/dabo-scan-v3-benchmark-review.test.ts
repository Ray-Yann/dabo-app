import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const pagePath = "app/dabo-scan-v3-benchmark/page.tsx";

test("le benchmark Scan V3 passe le résultat PaddleOCR dans le pipeline métier", () => {
  const source = fs.readFileSync(pagePath, "utf8");

  assert.match(
    source,
    /import \{ buildReceiptReviewFromOcr \} from "@\/lib\/dabo-scan-v3-pipeline"/,
  );
  assert.match(source, /buildReceiptReviewFromOcr\(/);
  assert.match(source, /source:\s*"photo"/);
  assert.match(source, /rawText:/);
  assert.match(source, /items:/);
});

test("le benchmark Scan V3 affiche la vérification humaine sans enregistrer les achats", () => {
  const source = fs.readFileSync(pagePath, "utf8");

  assert.match(
    source,
    /import DaboScanV3Review from "@\/components\/DaboScanV3Review"/,
  );
  assert.match(source, /<DaboScanV3Review/);
  assert.match(source, /initialReview=/);
  assert.match(source, /onConfirm=/);

  assert.doesNotMatch(source, /shopping_items/);
  assert.doesNotMatch(source, /shopping_receipts/);
  assert.doesNotMatch(source, /dabo_set_shopping_item_status/);
});
