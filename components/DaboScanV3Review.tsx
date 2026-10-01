"use client";

import { useState } from "react";
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
      <h2 id="dabo-scan-v3-review-title">Vérifier le ticket</h2>

      <p>
        Vérifiez les informations reconnues avant de confirmer. DABO
        n'enregistrera pas silencieusement une donnée incertaine.
      </p>

      <dl>
        <div>
          <dt>Commerce</dt>
          <dd>
            <input
              disabled={disabled}
              aria-label="Commerce"
              value={review.merchant}
              onChange={(event) => updateReceiptMerchant(event.target.value)}
            />
          </dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>
            <input
              disabled={disabled}
              aria-label="Date d'achat"
              type="date"
              value={review.purchaseDate ?? ""}
              onChange={(event) => updateReceiptDate(event.target.value)}
            />
          </dd>
        </div>
        <div>
          <dt>Total du ticket</dt>
          <dd>
            <input
              disabled={disabled}
              aria-label="Total du ticket"
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
              Article {index + 1}
              {item.needsReview ? " — à vérifier" : ""}
            </legend>

            <label>
              Article
              <input
                disabled={disabled}
                aria-label={`Article ${index + 1} — libellé`}
                value={item.label}
                onChange={(event) =>
                  updateItem(index, "label", event.target.value)
                }
              />
            </label>

            <label>
              Quantité / poids
              <input
                disabled={disabled}
                aria-label={`Article ${index + 1} — quantité ou poids`}
                inputMode="decimal"
                value={numberValue(item.quantity)}
                onChange={(event) =>
                  updateItem(index, "quantity", event.target.value)
                }
              />
            </label>

            <label>
              Unité
              <input
                disabled={disabled}
                aria-label={`Article ${index + 1} — unité`}
                value={item.unit ?? ""}
                onChange={(event) =>
                  updateItem(index, "unit", event.target.value)
                }
              />
            </label>

            <label>
              Prix unitaire
              <input
                disabled={disabled}
                aria-label={`Article ${index + 1} — prix unitaire`}
                inputMode="decimal"
                value={numberValue(item.unitPrice)}
                onChange={(event) =>
                  updateItem(index, "unitPrice", event.target.value)
                }
              />
            </label>

            <label>
              Total de la ligne
              <input
                disabled={disabled}
                aria-label={`Article ${index + 1} — total`}
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
                Valider cet article
              </button>
            ) : null}
          </fieldset>
        ))}
      </div>

      {!review.canConfirm ? (
        <p role="status">
          Vérification requise : corrigez les informations signalées avant de
          confirmer ce ticket.
        </p>
      ) : (
        <p role="status">Le ticket est cohérent et prêt à être confirmé.</p>
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
        Confirmer les achats
      </button>
    </section>
  );
}
