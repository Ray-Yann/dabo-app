import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, verifyUserToken } from "@/lib/supabase-admin";
import { sendEventNotification } from "@/lib/server-event-notifications";

// Seules ces clés peuvent déclencher une notification — empêche quiconque
// d'injecter un texte arbitraire dans une notification, même en cas de jeton
// valide détourné.
const ALLOWED_KEYS = ["notif_item_bought", "notif_task_done", "notif_item_urgent", "notif_task_urgent", "notif_member_joined", "notif_task_assigned", "notif_item_assigned", "notif_task_comment", "notif_item_comment", "notif_bill_paid"];
const TARGETED_ONLY_KEYS = ["notif_task_assigned", "notif_item_assigned", "notif_task_comment", "notif_item_comment"];

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let { householdId, excludeMemberId, targetMemberIds, key, params, resourceId } = await req.json();
  if (!householdId || !key) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }
  if (!ALLOWED_KEYS.includes(key)) {
    return NextResponse.json({ error: "Message non autorisé" }, { status: 400 });
  }

  if (
    key === "notif_bill_paid" &&
    (typeof resourceId !== "string" || resourceId.length === 0)
  ) {
    return NextResponse.json(
      { error: "Identifiant de facture manquant" },
      { status: 400 }
    );
  }

  if (TARGETED_ONLY_KEYS.includes(key) && targetMemberIds === undefined) {
    return NextResponse.json(
      { error: "Cette notification exige un destinataire ciblé" },
      { status: 400 }
    );
  }

  if (
    targetMemberIds !== undefined &&
    (
      !Array.isArray(targetMemberIds) ||
      targetMemberIds.length > 50 ||
      targetMemberIds.some(
        (id: unknown) => typeof id !== "string" || id.length === 0
      )
    )
  ) {
    return NextResponse.json(
      { error: "Destinataires invalides" },
      { status: 400 }
    );
  }

  const userData = await verifyUserToken(token);
  if (!userData) {
    return NextResponse.json({ error: "Session invalide" }, { status: 401 });
  }

  const admin = createAdminClient();
  let eventDeliveryKey: string | null = null;

  // Vérifie que la personne qui déclenche la notification est bien elle-même
  // membre de ce foyer précis — jamais de foyer arbitraire fourni par le client.
  const { data: callerMember } = await admin
    .from("members")
    .select("id")
    .eq("id", excludeMemberId)
    .eq("household_id", householdId)
    .eq("user_id", userData.id)
    .is("left_at", null)
    .maybeSingle();

  if (!callerMember) {
    return NextResponse.json({ error: "Non autorisé pour ce foyer" }, { status: 403 });
  }

  if (key === "notif_bill_paid") {
    const { data: bill } = await admin
      .from("finance_bills")
      .select("label,status,visibility,paid_transaction_id")
      .eq("id", resourceId)
      .eq("household_id", householdId)
      .maybeSingle();

    if (
      !bill ||
      bill.visibility !== "household" ||
      bill.status !== "paid" ||
      !bill.paid_transaction_id
    ) {
      return NextResponse.json(
        { error: "Facture non éligible à une notification" },
        { status: 403 }
      );
    }

    const { data: paymentTransaction } = await admin
      .from("finance_transactions")
      .select("id")
      .eq("id", bill.paid_transaction_id)
      .eq("household_id", householdId)
      .eq("created_by_member_id", callerMember.id)
      .eq("source", "bill_payment")
      .maybeSingle();

    if (!paymentTransaction) {
      return NextResponse.json(
        { error: "Paiement non autorisé pour cette notification" },
        { status: 403 }
      );
    }

    eventDeliveryKey = `bill_paid:${paymentTransaction.id}`;
    params = { bill: bill.label };
  }

  try {
    const sent = await sendEventNotification({
      admin,
      householdId,
      excludeMemberId: callerMember.id,
      targetMemberIds,
      key,
      params: params || {},
      eventDeliveryKey,
    });

    return NextResponse.json({ sent });
  } catch (error) {
    console.error("[send-notification] Event transport unavailable", {
      message: error instanceof Error ? error.message : "Unknown event notification error",
    });

    return NextResponse.json(
      { error: "Configuration des notifications indisponible" },
      { status: 503 }
    );
  }
}
