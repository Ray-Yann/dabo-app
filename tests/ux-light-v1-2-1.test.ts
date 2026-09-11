import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const courses = fs.readFileSync("app/app/courses/page.tsx", "utf8");
const catalog = fs.readFileSync("lib/world-store-catalog.ts", "utf8");

test("UX Light V1.2.1 réserve le menu aux enseignes nationales vérifiées et aux magasins du foyer", () => {
  assert.ok(courses.includes("VERIFIED_STORE_SUPPLEMENTS[household?.country_code"));
  assert.ok(courses.includes("...householdStores.map((store) => store.name)"));
  assert.ok(!courses.includes("...worldStores"));
  assert.ok(!courses.includes("setWorldStores"));
  assert.ok(!courses.includes("/api/store-suggestions?country="));
});

test("UX Light V1.2.1 garde Autre magasin comme porte de sortie manuelle", () => {
  assert.ok(courses.includes('<option value={OTHER_STORE}>{t("courses_store_other")}</option>'));
  assert.ok(courses.includes('supabase.from("household_stores").insert'));
});

test("UX Light V1.2.1 conserve un catalogue belge strict et crédible", () => {
  const be = catalog.match(/BE:\s*\[([^\]]+)\]/)?.[1] || "";
  for (const name of ["Colruyt", "Delhaize", "Carrefour", "Lidl", "Aldi", "Albert Heijn", "Intermarché", "Jumbo"]) {
    assert.ok(be.includes(name), `BE doit contenir ${name}`);
  }
  for (const name of ["Walmart", "Okay", "Ekoplaza", "Profi", "Mix Markt"]) {
    assert.ok(!be.includes(name), `BE ne doit pas contenir ${name}`);
  }
});
