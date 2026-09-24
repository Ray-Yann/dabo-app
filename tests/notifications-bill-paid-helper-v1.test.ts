import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const notifications = fs.readFileSync("lib/notifications.ts", "utf8");

test("Bill Paid helper expose notifyBillPaid", () => {
  assert.match(notifications, /export async function notifyBillPaid\(/);
});

test("Bill Paid helper utilise la cle notif_bill_paid", () => {
  assert.match(
    notifications,
    /notifyBillPaid[\s\S]*key:\s*"notif_bill_paid"/
  );
});

test("Bill Paid helper envoie l identifiant de facture comme resourceId", () => {
  assert.match(
    notifications,
    /notifyBillPaid[\s\S]*resourceId:\s*billId/
  );
});

test("Bill Paid helper ne transmet pas de libelle de facture client", () => {
  const start = notifications.indexOf("export async function notifyBillPaid");
  assert.notEqual(start, -1);

  const helper = notifications.slice(start);
  assert.doesNotMatch(helper, /params\s*:/);
  assert.doesNotMatch(helper, /billLabel/);
});

test("Bill Paid helper preserve le caractere non bloquant des notifications", () => {
  assert.match(
    notifications,
    /notifyBillPaid[\s\S]*try\s*{[\s\S]*catch/
  );
});
