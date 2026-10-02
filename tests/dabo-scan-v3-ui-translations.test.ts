import test from "node:test";
import assert from "node:assert/strict";
import { translations } from "../lib/i18n";

const keys = [
  "courses_add_choice_title",
  "courses_add_choice_help",
  "courses_add_manual",
  "courses_add_manual_help",
  "scan_v3_intro",
  "scan_v3_import_image_or_pdf",
  "scan_v3_file_type_error",
  "scan_v3_take_receipt_photo",
  "scan_v3_preview_alt",
  "scan_v3_remove_receipt",
  "scan_v3_analyzing",
  "scan_v3_analyze",
  "scan_v3_image_only_error",
  "scan_v3_ocr_empty_error",
  "scan_v3_analyze_error",
  "scan_v3_save_error",
  "scan_v3_saved_title",
  "scan_v3_saved_note",
  "scan_v3_scan_another",
  "scan_v3_review_title",
  "scan_v3_review_intro",
  "scan_v3_purchase_date",
  "scan_v3_receipt_total",
  "scan_v3_item",
  "scan_v3_needs_review",
  "scan_v3_item_label",
  "scan_v3_quantity_weight",
  "scan_v3_unit",
  "scan_v3_unit_price",
  "scan_v3_line_total",
  "scan_v3_validate_item",
  "scan_v3_review_required",
  "scan_v3_review_ready",
  "scan_v3_confirm_purchases",
  "scan_v3_item_label_aria",
  "scan_v3_item_quantity_aria",
  "scan_v3_item_unit_aria",
  "scan_v3_item_unit_price_aria",
  "scan_v3_item_total_aria",
] as const;

test("toutes les clés UI Scan V3 existent dans les 7 langues DABO", () => {
  for (const lang of ["fr", "nl", "en", "de", "es", "it", "pt"] as const) {
    for (const key of keys) {
      const value = translations[lang][key];
      assert.equal(
        typeof value,
        "string",
        `${lang}.${key} doit exister`,
      );
      assert.ok(
        value?.trim(),
        `${lang}.${key} ne doit pas être vide`,
      );
    }
  }
});

test("les libellés accessibles dynamiques Scan V3 conservent le paramètre index", () => {
  const dynamicKeys = [
    "scan_v3_item_label_aria",
    "scan_v3_item_quantity_aria",
    "scan_v3_item_unit_aria",
    "scan_v3_item_unit_price_aria",
    "scan_v3_item_total_aria",
  ] as const;

  for (const lang of ["fr", "nl", "en", "de", "es", "it", "pt"] as const) {
    for (const key of dynamicKeys) {
      assert.match(
        translations[lang][key] ?? "",
        /\{index\}/,
        `${lang}.${key}`,
      );
    }
  }
});
