import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/2026-10-01-dabo-scan-v3-confirmed-receipts.sql";

test("Scan V3 possède une migration dédiée aux tickets confirmés", () => {
  assert.equal(fs.existsSync(migrationPath), true);
});

test("la migration conserve la date réelle du ticket séparément des timestamps de session", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  assert.match(
    sql,
    /alter table public\.shopping_sessions[\s\S]*purchase_date date/i,
  );
});

test("la persistance conserve les données structurées nécessaires des lignes du ticket", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  assert.match(sql, /receipt_quantity/i);
  assert.match(sql, /receipt_unit/i);
  assert.match(sql, /line_total/i);
  assert.match(sql, /unit_price/i);
});

test("l'import confirmé passe par une RPC atomique protégée", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  assert.match(
    sql,
    /create or replace function public\.dabo_import_confirmed_receipt/i,
  );
  assert.match(sql, /security definer/i);
  assert.match(sql, /auth\.uid\(\)/i);
  assert.match(sql, /m\.left_at is null/i);
  assert.match(sql, /Active household member required/i);
  assert.match(sql, /Shopper must belong to household/i);
});

test("l'import Scan V3 crée une session Courses sans créer directement de transaction Finance", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const importStart = sql.indexOf(
    "create or replace function public.dabo_import_confirmed_receipt",
  );
  const financeStart = sql.indexOf(
    "create or replace function public.dabo_record_shopping_session_expense",
  );

  assert.ok(importStart >= 0);
  assert.ok(financeStart > importStart);

  const importFunction = sql.slice(importStart, financeStart);

  assert.match(importFunction, /insert into public\.shopping_receipts/i);
  assert.match(importFunction, /insert into public\.shopping_sessions/i);
  assert.match(importFunction, /insert into public\.shopping_items/i);
  assert.doesNotMatch(
    importFunction,
    /insert into public\.finance_transactions/i,
  );
});

test("Finance préfère la date réelle du ticket lorsqu'elle existe", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");

  assert.match(
    sql,
    /v_occurred_on\s*:=\s*coalesce\(\s*v_session\.purchase_date,/i,
  );
});


test("la RPC refuse un ticket dont articles et ajustements ne correspondent pas au total", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const importStart = sql.indexOf(
    "create or replace function public.dabo_import_confirmed_receipt",
  );
  const financeStart = sql.indexOf(
    "create or replace function public.dabo_record_shopping_session_expense",
  );

  assert.ok(importStart >= 0);
  assert.ok(financeStart > importStart);

  const importFunction = sql.slice(importStart, financeStart);

  assert.match(
    importFunction,
    /v_items_total\s*:=\s*v_items_total\s*\+\s*v_line_total/i,
  );
  assert.match(
    importFunction,
    /v_adjustments_total\s*:=/i,
  );
  assert.match(
    importFunction,
    /abs\s*\(\s*round\s*\(\s*v_items_total\s*\+\s*v_adjustments_total\s*,\s*2\s*\)\s*-\s*round\s*\(\s*p_total_amount\s*,\s*2\s*\)\s*\)\s*>\s*0\.01/i,
  );
  assert.match(
    importFunction,
    /raise exception[^;]*total/i,
  );
});


test("les articles importés conservent le magasin confirmé du ticket", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const importStart = sql.indexOf(
    "create or replace function public.dabo_import_confirmed_receipt",
  );
  const financeStart = sql.indexOf(
    "create or replace function public.dabo_record_shopping_session_expense",
  );

  assert.ok(importStart >= 0);
  assert.ok(financeStart > importStart);

  const importFunction = sql.slice(importStart, financeStart);

  assert.match(
    importFunction,
    /insert into public\.shopping_items\s*\([\s\S]*?store_name[\s\S]*?\)\s*values/i,
  );
  assert.match(
    importFunction,
    /nullif\s*\(\s*btrim\s*\(\s*coalesce\s*\(\s*p_merchant\s*,\s*''\s*\)\s*\)\s*,\s*''\s*\)/i,
  );
});


test("l'import Scan V3 est idempotent pour une même tentative client", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const importStart = sql.indexOf(
    "create or replace function public.dabo_import_confirmed_receipt",
  );
  const financeStart = sql.indexOf(
    "create or replace function public.dabo_record_shopping_session_expense",
  );

  assert.ok(importStart >= 0);
  assert.ok(financeStart > importStart);

  const importFunction = sql.slice(importStart, financeStart);

  assert.match(
    sql,
    /alter table public\.shopping_receipts[\s\S]*?add column if not exists client_request_id uuid/i,
  );
  assert.match(
    sql,
    /create unique index if not exists[\s\S]*?shopping_receipts[\s\S]*?household_id[\s\S]*?client_request_id/i,
  );
  assert.match(
    importFunction,
    /p_client_request_id\s+uuid/i,
  );
  assert.match(
    importFunction,
    /where[\s\S]*?household_id\s*=\s*p_household_id[\s\S]*?client_request_id\s*=\s*p_client_request_id/i,
  );
  assert.match(
    importFunction,
    /return\s+v_receipt_id/i,
  );
});


test("la RPC Scan V3 ne persiste jamais le texte OCR brut", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const importStart = sql.indexOf(
    "create or replace function public.dabo_import_confirmed_receipt",
  );
  const financeStart = sql.indexOf(
    "create or replace function public.dabo_record_shopping_session_expense",
  );

  assert.ok(importStart >= 0);
  assert.ok(financeStart > importStart);

  const importFunction = sql.slice(importStart, financeStart);
  const receiptInsertStart = importFunction.indexOf(
    "insert into public.shopping_receipts",
  );

  assert.ok(receiptInsertStart >= 0);

  const receiptInsert = importFunction.slice(receiptInsertStart);

  assert.doesNotMatch(
    receiptInsert,
    /\bp_raw_text\b/i,
  );
  assert.match(
    receiptInsert,
    /raw_text[\s\S]*?values[\s\S]*?\bnull\b/i,
  );
});


test("l'idempotence Scan V3 résiste aussi à deux imports concurrents", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const importStart = sql.indexOf(
    "create or replace function public.dabo_import_confirmed_receipt",
  );
  const financeStart = sql.indexOf(
    "create or replace function public.dabo_record_shopping_session_expense",
  );

  assert.ok(importStart >= 0);
  assert.ok(financeStart > importStart);

  const importFunction = sql.slice(importStart, financeStart);

  assert.match(
    importFunction,
    /pg_advisory_xact_lock/i,
  );

  const lockPosition = importFunction.search(/pg_advisory_xact_lock/i);
  const lookupPosition = importFunction.search(
    /client_request_id\s*=\s*p_client_request_id/i,
  );

  assert.ok(lockPosition >= 0);
  assert.ok(lookupPosition > lockPosition);
});


test("la RPC Scan V3 exige une date d'achat confirmée", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const importStart = sql.indexOf(
    "create or replace function public.dabo_import_confirmed_receipt",
  );
  const financeStart = sql.indexOf(
    "create or replace function public.dabo_record_shopping_session_expense",
  );

  assert.ok(importStart >= 0);
  assert.ok(financeStart > importStart);

  const importFunction = sql.slice(importStart, financeStart);

  assert.ok(
    importFunction.includes("if p_purchase_date is null then"),
  );
  assert.ok(
    importFunction.includes(
      "raise exception 'Confirmed receipt purchase date required';",
    ),
  );
});


test("la RPC Scan V3 exige un commerce confirmé", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const importStart = sql.indexOf(
    "create or replace function public.dabo_import_confirmed_receipt",
  );
  const financeStart = sql.indexOf(
    "create or replace function public.dabo_record_shopping_session_expense",
  );

  assert.ok(importStart >= 0);
  assert.ok(financeStart > importStart);

  const importFunction = sql.slice(importStart, financeStart);

  assert.ok(
    importFunction.includes(
      "if p_merchant is null or btrim(p_merchant) = '' then",
    ),
  );
  assert.ok(
    importFunction.includes(
      "raise exception 'Confirmed receipt merchant required';",
    ),
  );
});


test("la RPC Scan V3 n'accepte que les sources photo ou digital_document", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const importStart = sql.indexOf(
    "create or replace function public.dabo_import_confirmed_receipt",
  );
  const financeStart = sql.indexOf(
    "create or replace function public.dabo_record_shopping_session_expense",
  );

  assert.ok(importStart >= 0);
  assert.ok(financeStart > importStart);

  const importFunction = sql.slice(importStart, financeStart);

  assert.ok(
    importFunction.includes(
      "if p_source is null or btrim(p_source) not in ('photo', 'digital_document') then",
    ),
  );
  assert.ok(
    importFunction.includes(
      "raise exception 'Confirmed receipt source invalid';",
    ),
  );
});
