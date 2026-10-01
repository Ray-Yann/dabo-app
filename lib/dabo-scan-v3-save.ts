import type { ConfirmedReceiptPayload } from "@/lib/dabo-scan-v3-confirmation";

export type ScanV3RpcResult = {
  data: string | null;
  error: { message: string } | null;
};

export type ScanV3SupabaseClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => PromiseLike<ScanV3RpcResult>;
};

export type SaveConfirmedReceiptInput = {
  householdId: string;
  shopperMemberId: string;
  clientRequestId: string;
  payload: ConfirmedReceiptPayload;
};

export async function saveConfirmedReceipt(
  supabase: ScanV3SupabaseClient,
  input: SaveConfirmedReceiptInput,
): Promise<string> {
  const { householdId, shopperMemberId, clientRequestId, payload } = input;

  if (!householdId.trim()) {
    throw new Error("Household required");
  }

  if (!shopperMemberId.trim()) {
    throw new Error("Shopper required");
  }

  if (!clientRequestId.trim()) {
    throw new Error("Client request id required");
  }

  const { data, error } = await supabase.rpc(
    "dabo_import_confirmed_receipt",
    {
      p_household_id: householdId,
      p_shopper_member_id: shopperMemberId,
      p_merchant: payload.merchant,
      p_purchase_date: payload.purchaseDate,
      p_total_amount: payload.totalAmount,
      p_currency: payload.currency,
      p_source: payload.source,
      // Le texte OCR reste temporaire pendant la vÃ©rification mais n'est
      // pas persistÃ© afin de minimiser les donnÃ©es potentiellement sensibles.
      p_raw_text: null,
      p_client_request_id: clientRequestId,
      p_adjustments: payload.adjustments,
      p_items: payload.items,
    },
  );

  if (error) {
    throw new Error(error.message || "Import failed");
  }

  if (typeof data !== "string" || !data.trim()) {
    throw new Error("Receipt import returned no receipt id");
  }

  return data;
}
