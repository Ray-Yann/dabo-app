import assert from "node:assert/strict";
import test from "node:test";

import {
  createScanV3ConfirmationController,
} from "../lib/dabo-scan-v3-controller";
import type { ReceiptReview } from "../lib/dabo-scan-v3-review";

function confirmedReview(): ReceiptReview {
  return {
    source: "photo",
    merchant: "Roi du jambon",
    purchaseDate: "2026-09-30",
    totalAmount: 33,
    currency: "EUR",
    rawText: "texte OCR sensible",
    items: [
      {
        label: "Cotis / Softbones",
        quantity: 3.06,
        unit: "kg",
        unitPrice: 7.2,
        totalPrice: 22.03,
        confidence: 0.98,
        needsReview: false,
        labelNeedsReview: false,
      },
      {
        label: "Poulet dure / Kip gerookt",
        quantity: 1.826,
        unit: "kg",
        unitPrice: 6,
        totalPrice: 10.96,
        confidence: 0.98,
        needsReview: false,
        labelNeedsReview: false,
      },
    ],
    discounts: [{ label: "Arrondi", amount: 0.01 }],
    unresolvedItems: 0,
    consistency: {
      isConsistent: true,
      needsReview: false,
      itemsTotal: 32.99,
      adjustmentsTotal: 0.01,
      calculatedTotal: 33,
      difference: 0,
    },
    needsReview: false,
    canConfirm: true,
  };
}

test("le contrôleur Scan V3 réutilise le même clientRequestId lors d'un retry", async () => {
  const calls: Array<Record<string, unknown>> = [];

  const supabase = {
    rpc: async (_name: string, args: Record<string, unknown>) => {
      calls.push(args);

      if (calls.length === 1) {
        return {
          data: null,
          error: { message: "Erreur réseau temporaire" },
        };
      }

      return {
        data: "receipt-123",
        error: null,
      };
    },
  };

  const controller = createScanV3ConfirmationController({
    supabase,
    householdId: "household-1",
    shopperMemberId: "member-1",
    createClientRequestId: () => "stable-request-id",
  });

  await assert.rejects(
    () => controller.confirm(confirmedReview()),
    /Erreur réseau temporaire/,
  );

  const receiptId = await controller.confirm(confirmedReview());

  assert.equal(receiptId, "receipt-123");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].p_client_request_id, "stable-request-id");
  assert.equal(calls[1].p_client_request_id, "stable-request-id");
});


test("le contrôleur Scan V3 génère une nouvelle tentative après un enregistrement réussi", async () => {
  const requestIds = ["request-1", "request-2"];
  const calls: Array<Record<string, unknown>> = [];
  let generated = 0;

  const supabase = {
    rpc: async (_name: string, args: Record<string, unknown>) => {
      calls.push(args);

      return {
        data: `receipt-${calls.length}`,
        error: null,
      };
    },
  };

  const controller = createScanV3ConfirmationController({
    supabase,
    householdId: "household-1",
    shopperMemberId: "member-1",
    createClientRequestId: () => requestIds[generated++],
  });

  const firstReceiptId = await controller.confirm(confirmedReview());
  const secondReceiptId = await controller.confirm(confirmedReview());

  assert.equal(firstReceiptId, "receipt-1");
  assert.equal(secondReceiptId, "receipt-2");
  assert.equal(calls[0].p_client_request_id, "request-1");
  assert.equal(calls[1].p_client_request_id, "request-2");
  assert.equal(generated, 2);
});


test("le contrôleur Scan V3 partage le même clientRequestId entre deux confirmations simultanées", async () => {
  const calls: Array<Record<string, unknown>> = [];
  let generated = 0;
  let releaseFirstCall!: () => void;

  const firstCallPending = new Promise<void>((resolve) => {
    releaseFirstCall = resolve;
  });

  const supabase = {
    rpc: async (_name: string, args: Record<string, unknown>) => {
      calls.push(args);

      if (calls.length === 1) {
        await firstCallPending;
      }

      return {
        data: "receipt-concurrent",
        error: null,
      };
    },
  };

  const controller = createScanV3ConfirmationController({
    supabase,
    householdId: "household-1",
    shopperMemberId: "member-1",
    createClientRequestId: () => `concurrent-request-${++generated}`,
  });

  const firstConfirmation = controller.confirm(confirmedReview());
  const secondConfirmation = controller.confirm(confirmedReview());

  releaseFirstCall();

  const [firstReceiptId, secondReceiptId] = await Promise.all([
    firstConfirmation,
    secondConfirmation,
  ]);

  assert.equal(firstReceiptId, "receipt-concurrent");
  assert.equal(secondReceiptId, "receipt-concurrent");
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].p_client_request_id,
    "concurrent-request-1",
  );
  assert.equal(generated, 1);
});


test("le contrôleur Scan V3 refuse un ticket différent pendant une confirmation en cours", async () => {
  let releaseFirstCall!: () => void;

  const firstCallPending = new Promise<void>((resolve) => {
    releaseFirstCall = resolve;
  });

  const supabase = {
    rpc: async () => {
      await firstCallPending;

      return {
        data: "receipt-first",
        error: null,
      };
    },
  };

  const controller = createScanV3ConfirmationController({
    supabase,
    householdId: "household-1",
    shopperMemberId: "member-1",
    createClientRequestId: () => "request-first",
  });

  const firstReview = confirmedReview();
  const secondReview = {
    ...confirmedReview(),
    merchant: "Maison de la viande",
    totalAmount: 61.6,
  };

  const firstConfirmation = controller.confirm(firstReview);
  const secondConfirmation = controller.confirm(secondReview);

  releaseFirstCall();

  await assert.rejects(
    () => secondConfirmation,
    /confirmation.*cours|ticket.*différent/i,
  );

  assert.equal(await firstConfirmation, "receipt-first");
});
