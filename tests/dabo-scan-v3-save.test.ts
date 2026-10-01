import assert from "node:assert/strict";
import test from "node:test";

import {
  saveConfirmedReceipt,
  type ScanV3SupabaseClient,
} from "../lib/dabo-scan-v3-save";
import type { ConfirmedReceiptPayload } from "../lib/dabo-scan-v3-confirmation";

const payload: ConfirmedReceiptPayload = {
  source: "photo",
  merchant: "Roi du jambon",
  purchaseDate: "2026-09-30",
  totalAmount: 33,
  currency: "EUR",
  rawText: "ticket OCR",
  adjustments: [{ label: "Arrondi", amount: 0.01 }],
  items: [
    {
      name: "Cotis / Softbones",
      quantity: 3.06,
      unit: "kg",
      unitPrice: 7.2,
      lineTotal: 22.03,
    },
    {
      name: "Poulet dure / Kip gerookt",
      quantity: 1.826,
      unit: "kg",
      unitPrice: 6,
      lineTotal: 10.96,
    },
  ],
};

test("Scan V3 enregistre un ticket confirmé via une seule RPC atomique", async () => {
  const calls: Array<{ name: string; args: unknown }> = [];

  const supabase: ScanV3SupabaseClient = {
    rpc: async (name, args) => {
      calls.push({ name, args });
      return {
        data: "11111111-1111-1111-1111-111111111111",
        error: null,
      };
    },
  };

  const receiptId = await saveConfirmedReceipt(supabase, {
    householdId: "22222222-2222-2222-2222-222222222222",
    shopperMemberId: "33333333-3333-3333-3333-333333333333",
    clientRequestId: "11111111-1111-4111-8111-111111111111",
    payload,
  });

  assert.equal(receiptId, "11111111-1111-1111-1111-111111111111");
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.name, "dabo_import_confirmed_receipt");
  assert.deepEqual(calls[0]?.args, {
    p_household_id: "22222222-2222-2222-2222-222222222222",
    p_shopper_member_id: "33333333-3333-3333-3333-333333333333",
    p_merchant: "Roi du jambon",
    p_purchase_date: "2026-09-30",
    p_total_amount: 33,
    p_currency: "EUR",
    p_source: "photo",
    p_raw_text: null,
    p_client_request_id: "11111111-1111-4111-8111-111111111111",
    p_adjustments: [{ label: "Arrondi", amount: 0.01 }],
    p_items: payload.items,
  });
});

test("Scan V3 propage une erreur RPC et ne prétend jamais avoir enregistré le ticket", async () => {
  const supabase: ScanV3SupabaseClient = {
    rpc: async () => ({
      data: null,
      error: { message: "Import failed" },
    }),
  };

  await assert.rejects(
    () =>
      saveConfirmedReceipt(supabase, {
        householdId: "22222222-2222-2222-2222-222222222222",
        shopperMemberId: "33333333-3333-3333-3333-333333333333",
        clientRequestId: "11111111-1111-4111-8111-111111111111",
        payload,
      }),
    /Import failed/,
  );
});
