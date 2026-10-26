import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const ui = fs.readFileSync("app/app/courses/reserves/page.tsx", "utf8");
const sql = fs.readFileSync("supabase/migrations/20261021_courses_reserves_partial_transfer_v1.sql", "utf8");

test("réserves : le transfert demande une quantité et utilise une RPC atomique dédiée", () => {
 assert.match(ui, /Quantité à déplacer/);
 assert.match(ui, /pantry_stock_transfer_partial/);
 assert.match(ui, /p_quantity:n/);
 assert.match(ui, /n>editing\.stock\.quantity/);
 assert.match(ui, /Number\.isInteger\(n\)/);
});

test("réserves : transfert limité au foyer et quantité validée côté serveur", () => {
 assert.match(sql, /auth\.uid\(\) is null/);
 assert.match(sql, /m\.left_at is null/);
 assert.match(sql, /p_quantity>v_source\.quantity/);
 assert.match(sql, /p_quantity<>round\(p_quantity,3\)/);
 assert.match(sql, /p_quantity<>trunc\(p_quantity\)/);
 assert.match(sql, /for update/);
 assert.match(sql, /pg_advisory_xact_lock/);
});

test("réserves : conservation du stock total et double historique de transfert", () => {
 assert.match(sql, /quantity=quantity\+p_quantity/);
 assert.match(sql, /quantity=quantity-p_quantity/);
 assert.match(sql, /'transferred',-p_quantity/);
 assert.match(sql, /'transferred',p_quantity/);
 assert.match(sql, /expires_on is not distinct from/);
});
