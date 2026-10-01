import {
  buildConfirmedReceiptPayload,
} from "@/lib/dabo-scan-v3-confirmation";
import type { ReceiptReview } from "@/lib/dabo-scan-v3-review";
import {
  saveConfirmedReceipt,
  type ScanV3SupabaseClient,
} from "@/lib/dabo-scan-v3-save";

export type ScanV3ConfirmationControllerOptions = {
  supabase: ScanV3SupabaseClient;
  householdId: string;
  shopperMemberId: string;
  createClientRequestId: () => string;
};

export type ScanV3ConfirmationController = {
  confirm: (review: ReceiptReview) => Promise<string>;
};

export function createScanV3ConfirmationController(
  options: ScanV3ConfirmationControllerOptions,
): ScanV3ConfirmationController {
  const {
    supabase,
    householdId,
    shopperMemberId,
    createClientRequestId,
  } = options;

  let clientRequestId: string | null = null;
  let confirmationInFlight: Promise<string> | null = null;
  let confirmationFingerprint: string | null = null;

  return {
    async confirm(review: ReceiptReview): Promise<string> {
      const payload = buildConfirmedReceiptPayload(review);
      const fingerprint = JSON.stringify({
        source: payload.source,
        merchant: payload.merchant,
        purchaseDate: payload.purchaseDate,
        totalAmount: payload.totalAmount,
        currency: payload.currency,
        adjustments: payload.adjustments,
        items: payload.items,
      });

      if (confirmationInFlight !== null) {
        if (confirmationFingerprint !== fingerprint) {
          throw new Error(
            "Un ticket différent ne peut pas être confirmé pendant une confirmation en cours.",
          );
        }

        return confirmationInFlight;
      }

      if (clientRequestId === null) {
        const generatedId = createClientRequestId().trim();

        if (!generatedId) {
          throw new Error("Client request id required");
        }

        clientRequestId = generatedId;
      }

      const requestId = clientRequestId;

      confirmationFingerprint = fingerprint;
      confirmationInFlight = saveConfirmedReceipt(supabase, {
        householdId,
        shopperMemberId,
        clientRequestId: requestId,
        payload,
      });

      try {
        const receiptId = await confirmationInFlight;
        clientRequestId = null;
        return receiptId;
      } finally {
        confirmationInFlight = null;
        confirmationFingerprint = null;
      }
    },
  };
}
