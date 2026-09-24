import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const sendRoute = fs.readFileSync("app/api/send-notification/route.ts", "utf8");
const eventNotifications = fs.readFileSync("lib/server-event-notifications.ts", "utf8");

test("Bill Paid V1 autorise la cle de notification facture payee", () => {
  assert.match(sendRoute, /ALLOWED_KEYS[\s\S]*notif_bill_paid/);
});

test("Bill Paid V1 exige un identifiant de ressource pour une facture payee", () => {
  assert.match(
    sendRoute,
    /key === "notif_bill_paid"[\s\S]*resourceId/
  );
});

test("Bill Paid V1 recharge la facture depuis la base dans le foyer authentifie", () => {
  assert.match(
    sendRoute,
    /from\("finance_bills"\)[\s\S]*select\([\s\S]*label[\s\S]*status[\s\S]*visibility[\s\S]*paid_transaction_id[\s\S]*\)[\s\S]*eq\("id", resourceId\)[\s\S]*eq\("household_id", householdId\)/
  );
});

test("Bill Paid V1 refuse de diffuser une facture non partagee ou non payee", () => {
  assert.match(
    sendRoute,
    /bill[\s\S]*visibility[\s\S]*household/
  );
  assert.match(
    sendRoute,
    /bill[\s\S]*status[\s\S]*paid/
  );
  assert.match(
    sendRoute,
    /bill[\s\S]*paid_transaction_id/
  );
});

test("Bill Paid V1 verifie que la transaction de paiement appartient a l appelant", () => {
  assert.match(
    sendRoute,
    /from\("finance_transactions"\)[\s\S]*eq\("id", bill\.paid_transaction_id\)[\s\S]*eq\("household_id", householdId\)[\s\S]*eq\("created_by_member_id", callerMember\.id\)[\s\S]*eq\("source", "bill_payment"\)/
  );
});

test("Bill Paid V1 derive le libelle depuis la facture serveur", () => {
  assert.match(
    sendRoute,
    /params\s*=\s*\{\s*bill:\s*bill\.label\s*\}/
  );
});

test("Bill Paid V1 ne fait pas confiance a un libelle de facture fourni par le client", () => {
  assert.doesNotMatch(
    sendRoute,
    /notif_bill_paid[\s\S]{0,500}params\.bill/
  );
});


test("Bill Paid V1 deduplique durablement chaque transaction par destinataire", () => {
  assert.match(
    eventNotifications,
    /from\("event_notification_deliveries"\)/
  );
  assert.match(
    sendRoute,
    /bill_paid:[^\n]*paymentTransaction\.id/
  );
  assert.match(
    eventNotifications,
    /member_id/
  );
});

test("Bill Paid V1 ignore un rejeu deja reclame sans renvoyer le push", () => {
  assert.match(
    eventNotifications,
    /23505/
  );
});
