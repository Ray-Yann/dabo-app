import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/app/finances/page.tsx", import.meta.url), "utf8");

test("Finance V1.1 ajoute une modification discrète sur chaque dépense", () => {
  assert.match(page, /Pencil/);
  assert.match(page, /aria-label={`Modifier \$\{title\}`}/);
  assert.match(page, /onEdit=\{\(\)=>startExpenseEdit\(tx\)\}/);
});

test("Finance V1.1 préremplit les champs avec la dépense sélectionnée", () => {
  assert.match(page, /function startExpenseEdit\(tx:Transaction\)/);
  assert.match(page, /setLabel\(tx\.label\)/);
  assert.match(page, /setAmount\(money\(Number\(tx\.amount\)\)\)/);
  assert.match(page, /setCategory\(tx\.category\)/);
  assert.match(page, /setDate\(tx\.occurred_on\)/);
  assert.match(page, /setPayer\(tx\.paid_by_member_id\|\|me\?\.id\|\|""\)/);
});

test("Finance V1.1 met à jour la dépense existante sans la recréer", () => {
  assert.match(page, /from\("finance_transactions"\)\.update\(\{paid_by_member_id:payer\|\|me\.id,amount:value,category,label:label\.trim\(\),occurred_on:date\}\)\.eq\("id",editingExpense\.id\)\.eq\("household_id",household\.id\)/);
  assert.match(page, /editingExpense\?"Enregistrer les modifications":"Enregistrer"/);
});
