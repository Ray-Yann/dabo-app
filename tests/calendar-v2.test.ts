import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const calendar = fs.readFileSync("app/app/calendrier/page.tsx", "utf8");
const i18n = fs.readFileSync("lib/i18n.ts", "utf8");
const privacy = fs.readFileSync("supabase-migrations/2026-09-07-personal-calendar.sql", "utf8");

test("Calendrier V2 rend le partage explicite au moment de créer un événement", () => {
  assert.ok(calendar.includes('newVisibility'));
  assert.ok(calendar.includes('setNewVisibility("household")'));
  assert.ok(calendar.includes('setNewVisibility("personal")'));
  assert.ok(calendar.includes('private_owner_id: newVisibility === "personal" ? me.id : null'));
});

test("Calendrier V2 garde le personnel réellement privé en base", () => {
  assert.ok(privacy.includes("visibility = 'personal'"));
  assert.ok(privacy.includes("private_owner_id in"));
  assert.ok(privacy.includes("user_id = auth.uid()"));
});

test("Calendrier V2 donne une vue Mois utile avec navigation et deux portées", () => {
  assert.ok(calendar.includes("moveMonth(-1)"));
  assert.ok(calendar.includes("moveMonth(1)"));
  assert.ok(calendar.includes("calendar_back_today"));
  assert.ok(calendar.includes("householdEventDays"));
  assert.ok(calendar.includes("personalEventDays"));
});

test("Calendrier V2 ne perd pas les événements passés ni les récurrences en naviguant dans les mois", () => {
  assert.ok(calendar.includes("visibleEvents.flatMap"));
  assert.ok(calendar.includes("monthOccurrence"));
  assert.ok(calendar.includes("Math.min(original.getDate(), lastDay)"));
  assert.ok(!calendar.includes("const monthEvents = upcoming.filter"));
});

test("Calendrier V2 explique ses choix dans les sept langues sans texte d'interface codé en dur", () => {
  for (const key of ["calendar_scope_label", "calendar_scope_household_hint", "calendar_scope_personal_hint", "calendar_month_household_legend", "calendar_month_personal_legend", "calendar_previous_month", "calendar_next_month"]) {
    assert.equal(i18n.split(`${key}:`).length - 1, 7, `${key} doit exister dans les 7 catalogues`);
  }
  assert.ok(calendar.includes('aria-label={t("calendar_previous_month")}'));
  assert.ok(calendar.includes('aria-label={t("calendar_next_month")}'));
});
