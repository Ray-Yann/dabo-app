import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("app/app/calendrier/page.tsx", "utf8");
const i18n = fs.readFileSync("lib/i18n.ts", "utf8");

test("Calendrier V2.1 rend chaque vraie date sélectionnable et accessible", () => {
  assert.match(page, /setSelectedMonthDay\(day\)/);
  assert.match(page, /aria-pressed=\{isSelected\}/);
  assert.match(page, /min-h-11/);
  assert.match(page, /focus-visible:ring-2/);
});

test("Calendrier V2.1 distingue le jour consulté du jour actuel", () => {
  assert.match(page, /isSelected[\s\S]*border-2 border-mustard bg-mustardBg/);
  assert.match(page, /isToday[\s\S]*bg-ink text-paper/);
});

test("Calendrier V2.1 affiche les événements autorisés du jour sous le mois", () => {
  assert.match(page, /selectedMonthEvents/);
  assert.match(page, /event\.title/);
  assert.match(page, /calendar_month_personal_legend/);
  assert.match(page, /calendar_month_household_legend/);
  assert.match(page, /calendar_month_no_event/);
});

test("Calendrier V2.1 réinitialise la sélection lors d'un changement de mois", () => {
  assert.match(page, /function moveMonth[\s\S]*setSelectedMonthDay\(null\)/);
  assert.match(page, /setMonthCursor\(new Date\(\)\); setSelectedMonthDay\(null\)/);
});

test("Calendrier V2.1 traduit son état vide dans les sept catalogues", () => {
  assert.equal((i18n.match(/calendar_month_no_event:/g) || []).length, 7);
});
