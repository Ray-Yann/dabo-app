import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("app/app/page.tsx", "utf8");
const card = fs.readFileSync("components/dabo/AttentionCard.tsx", "utf8");

test("Home V1.1 retire les raccourcis Courses/Tâches redondants", () => {
  assert.equal(page.includes('t("today_view_courses")'), false);
  assert.equal(page.includes('t("today_view_tasks")'), false);
});

test("Home V1.1 retire la bannière temporaire de migration d’icône de la Home", () => {
  assert.equal(page.includes("IconUpdateNotice"), false);
});

test("AttentionCard V1.1 adopte une densité mobile plus compacte", () => {
  assert.match(card, /px-3 py-3/);
  assert.match(card, /h-8 w-8/);
  assert.match(card, /text-\[10px\]/);
});
