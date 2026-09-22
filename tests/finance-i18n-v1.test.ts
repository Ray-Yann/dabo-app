import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("app/app/finances/page.tsx", "utf8");
const i18n = fs.readFileSync("lib/i18n.ts", "utf8");

test("Finance UI uses the shared language context", () => {
  assert.match(page, /useLanguage, useT/);
  assert.match(page, /const t = useT\(\)/);
  assert.match(page, /financePeriodLabel\(period,periodAnchor,locale\)/);
});

test("Finance page no longer exposes the audited French hard-coded UI", () => {
  for (const text of [
    "ARGENT DU FOYER", "Vue affichée", "Vue d’ensemble", "Où en est le foyer ?",
    "Déjà dépensé", "Encore à payer", "Engagements connus", "Revenir à aujourd’hui",
    "Ajouter une dépense", "Ajouter une facture", "Repères mensuels", "Marquer payée",
    "Les montants sont des repères pour comprendre le foyer",
  ]) assert.equal(page.includes(text), false, `hard-coded Finance copy remains: ${text}`);
});

test("Finance translations exist in all seven enabled catalogues", () => {
  for (const key of [
    "finance_eyebrow", "finance_view_overview", "finance_household_status",
    "finance_period_month", "finance_spent", "finance_still_to_pay",
    "finance_add_expense", "finance_add_bill", "finance_monthly_references",
    "finance_category_courses", "finance_error_save",
  ]) {
    const count = (i18n.match(new RegExp(`\\b${key}:`, "g")) || []).length;
    assert.equal(count, 7, `${key} must exist in FR/NL/EN/DE/ES/IT/PT`);
  }
});

test("Finance formatting follows the selected language locale", () => {
  assert.match(page, /fr:"fr-BE"/);
  assert.match(page, /nl:"nl-BE"/);
  assert.match(page, /en:"en-GB"/);
  assert.match(page, /de:"de-DE"/);
  assert.match(page, /es:"es-ES"/);
  assert.match(page, /it:"it-IT"/);
  assert.match(page, /pt:"pt-PT"/);
  assert.doesNotMatch(page, /toLocaleDateString\("fr-BE"\)/);
});
