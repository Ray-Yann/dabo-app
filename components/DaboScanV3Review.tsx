"use client";

import { useState } from "react";
import { useLanguage, useT } from "@/lib/language-context";
import { translateWithParams } from "@/lib/i18n";
import {
  applyReceiptItemCorrection,
  applyReceiptReviewCorrection,
  confirmReceiptReviewItem,
  type ReceiptReview,
} from "@/lib/dabo-scan-v3-review";

type DaboScanV3ReviewProps = {
  initialReview: ReceiptReview;
  onConfirm: (review: ReceiptReview) => void;
  disabled?: boolean;
};

function numberValue(value: number | null): string {
  return value === null ? "" : String(value);
}

function parseOptionalNumber(value: string): number | null {
  const normalized = value.trim().replace(",", ".");

  if (normalized === "") {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function DaboScanV3Review({
  initialReview,
  onConfirm,
  disabled = false,
}: DaboScanV3ReviewProps) {
  const [review, setReview] = useState(initialReview);
  const t = useT();
  const lang = useLanguage();

  const itemAria = (key: string, index: number) =>
    translateWithParams(lang, key, { index: String(index + 1) });

  function updateReceiptMerchant(value: string) {
    setReview(
      applyReceiptReviewCorrection(review, {
        merchant: value,
      }),
    );
  }

  function updateReceiptDate(value: string) {
    setReview(
      applyReceiptReviewCorrection(review, {
        purchaseDate: value.trim() || null,
      }),
    );
  }

  function updateReceiptTotal(value: string) {
    setReview(
      applyReceiptReviewCorrection(review, {
        totalAmount: parseOptionalNumber(value),
      }),
    );
  }

  function updateItem(
    itemIndex: number,
    field: "label" | "quantity" | "unit" | "unitPrice" | "totalPrice",
    value: string,
  ) {
    const item = review.items[itemIndex];

    const corrected = applyReceiptItemCorrection(review, itemIndex, {
      label: field === "label" ? value : item.label,
      quantity:
        field === "quantity" ? parseOptionalNumber(value) : item.quantity,
      unit:
        field === "unit"
          ? value.trim() || null
          : item.unit,
      unitPrice:
        field === "unitPrice" ? parseOptionalNumber(value) : item.unitPrice,
      totalPrice:
        field === "totalPrice" ? parseOptionalNumber(value) : item.totalPrice,
    });

    setReview(corrected);
  }

  return (
    <section aria-labelledby="dabo-scan-v3-review-title">
      <h2 id="dabo-scan-v3-review-title">{t("scan_v3_review_title")}</h2>

      <p>{t("scan_v3_review_intro")}</p>

      <dl>
        <div>
          <dt>{t("scan_merchant")}</dt>
          <dd>
            <input
              disabled={disabled}
              aria-label={t("scan_merchant")}
              value={review.merchant}
              onChange={(event) => updateReceiptMerchant(event.target.value)}
            />
          </dd>
        </div>
        <div>
          <dt>{t("scan_date")}</dt>
          <dd>
            <input
              disabled={disabled}
              aria-label={t("scan_v3_purchase_date")}
              type="date"
              value={review.purchaseDate ?? ""}
              onChange={(event) => updateReceiptDate(event.target.value)}
            />
          </dd>
        </div>
        <div>
          <dt>{t("scan_v3_receipt_total")}</dt>
          <dd>
            <input
              disabled={disabled}
              aria-label={t("scan_v3_receipt_total")}
              inputMode="decimal"
              value={numberValue(review.totalAmount)}
              onChange={(event) => updateReceiptTotal(event.target.value)}
            />
            <span>{review.currency}</span>
          </dd>
        </div>
      </dl>

      <div>
        {review.items.map((item, index) => (
          <fieldset key={index}>
            <legend>
              {t("scan_v3_item")} {index + 1}
              {item.needsReview ? ` — ${t("scan_v3_needs_review")}` : ""}
            </legend>

            <label>
              {t("scan_v3_item_label")}
              <input
                disabled={disabled}
                aria-label={itemAria("scan_v3_item_label_aria", index)}
                value={item.labelNeedsReview ? "" : item.label}
                onChange={(event) =>
                  updateItem(index, "label", event.target.value)
                }
              />
            </label>

            <label>
              {t("scan_v3_quantity_weight")}
              <input
                disabled={disabled}
                aria-label={itemAria("scan_v3_item_quantity_aria", index)}
                inputMode="decimal"
                value={numberValue(item.quantity)}
                onChange={(event) =>
                  updateItem(index, "quantity", event.target.value)
                }
              />
            </label>

            <label>
              {t("scan_v3_unit")}
              <input
                disabled={disabled}
                aria-label={itemAria("scan_v3_item_unit_aria", index)}
                value={item.unit ?? ""}
                onChange={(event) =>
                  updateItem(index, "unit", event.target.value)
                }
              />
            </label>

            <label>
              {t("scan_v3_unit_price")}
              <input
                disabled={disabled}
                aria-label={itemAria("scan_v3_item_unit_price_aria", index)}
                inputMode="decimal"
                value={numberValue(item.unitPrice)}
                onChange={(event) =>
                  updateItem(index, "unitPrice", event.target.value)
                }
              />
            </label>

            <label>
              {t("scan_v3_line_total")}
              <input
                disabled={disabled}
                aria-label={itemAria("scan_v3_item_total_aria", index)}
                inputMode="decimal"
                value={numberValue(item.totalPrice)}
                onChange={(event) =>
                  updateItem(index, "totalPrice", event.target.value)
                }
              />
            </label>

            {item.needsReview && !item.labelNeedsReview ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  setReview(confirmReceiptReviewItem(review, index));
                }}
              >
                {t("scan_v3_validate_item")}
              </button>
            ) : null}
          </fieldset>
        ))}
      </div>

      {!review.canConfirm ? (
        <p role="status">{t("scan_v3_review_required")}</p>
      ) : (
        <p role="status">{t("scan_v3_review_ready")}</p>
      )}

      <button
        type="button"
        disabled={disabled || !review.canConfirm}
        onClick={() => {
          if (review.canConfirm) {
            onConfirm(review);
          }
        }}
      >
        {t("scan_v3_confirm_purchases")}
      </button>
    </section>
  );
}
