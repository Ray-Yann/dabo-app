import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const courses = fs.readFileSync("app/app/courses/page.tsx", "utf8");
const storesApi = fs.readFileSync("app/api/store-suggestions/route.ts", "utf8");
const storeCatalog = fs.readFileSync("lib/world-store-catalog.ts", "utf8");
const calendar = fs.readFileSync("app/app/calendrier/page.tsx", "utf8");
const nav = fs.readFileSync("components/DaboMainNav.tsx", "utf8");

test("UX Light V1.2 ne transforme plus 001 en présence dans tous les pays", () => {
  assert.ok(!storesApi.includes('include.includes(cc) || include.includes("001")'));
  assert.ok(storesApi.includes("return include.includes(cc)"));
});

test("UX Light V1.2 sépare les magasins du foyer du catalogue national", () => {
  assert.ok(!courses.includes('supabase.from("global_stores").insert'));
  assert.ok(!courses.includes('supabase.from("global_stores").select'));
  assert.ok(courses.includes('supabase.from("household_stores").insert'));
});

test("UX Light V1.2 fournit des enseignes crédibles pour les principaux pays DABO", () => {
  for (const code of ["BE", "FR", "NL", "GB", "DE", "ES", "IT", "PT"]) assert.ok(storeCatalog.includes(`${code}: [`));
  assert.ok(storeCatalog.includes('BE: ["Colruyt", "Delhaize", "Carrefour"'));
  assert.ok(!storeCatalog.match(/BE:\s*\[[^\]]*Walmart/));
});

test("UX Light V1.2 retire le titre À acheter redondant", () => {
  assert.ok(!courses.includes('<div className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">{t("courses_to_buy")}</div>'));
});

test("UX Light V1.2 allège l'aide Calendrier et explicite l'année d'une prochaine occurrence", () => {
  assert.ok(!calendar.includes('id={`calendar-${view}-v1`}'));
  assert.ok(calendar.includes('view === "personal" && <IntroTip'));
  assert.ok(calendar.includes('date.getFullYear() !== currentYear'));
});

test("UX Light V1.2 réserve un libellé légèrement plus compact à Calendrier dans la navigation", () => {
  assert.ok(nav.includes('item.key==="calendar"?"text-[9px]":"text-[9.5px]"'));
});
