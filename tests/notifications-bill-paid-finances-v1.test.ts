import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const finances = fs.readFileSync("app/app/finances/page.tsx", "utf8");

test("Finances classique importe le helper securise Bill Paid", () => {
  assert.match(
    finances,
    /import\s*{[^}]*notifyBillPaid[^}]*}\s*from\s*["']@\/lib\/notifications["']/
  );
});

test("Finances classique notifie seulement apres un paiement reussi", () => {
  const rpcIndex = finances.indexOf('supabase.rpc("pay_finance_bill"');
  const errorIndex = finances.indexOf("if(e)throw e", rpcIndex);
  const notifyIndex = finances.indexOf("notifyBillPaid(", rpcIndex);

  assert.notEqual(rpcIndex, -1);
  assert.notEqual(errorIndex, -1);
  assert.notEqual(notifyIndex, -1);
  assert.ok(notifyIndex > errorIndex);
});

test("Finances classique transmet le foyer acteur et identifiant de facture", () => {
  assert.match(
    finances,
    /notifyBillPaid\(\s*supabase\s*,\s*household\.id\s*,\s*me\.id\s*,\s*bill\.id\s*\)/
  );
});

test("Finances classique ne transmet pas le libelle de facture au helper", () => {
  const markPaidStart = finances.indexOf("async function markPaid");
  assert.notEqual(markPaidStart, -1);

  const markPaidEnd = finances.indexOf("\n}", markPaidStart);
  const markPaid = finances.slice(
    markPaidStart,
    markPaidEnd === -1 ? undefined : markPaidEnd + 2
  );

  assert.doesNotMatch(markPaid, /notifyBillPaid\([^)]*bill\.label/);
});
