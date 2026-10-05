import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const page = fs.readFileSync("app/app/calendrier/page.tsx", "utf8");
const css = fs.readFileSync("app/globals.css", "utf8");

test("Planning V2.2.1 nomme explicitement la date et l'heure d'une échéance", () => {
  assert.ok(page.includes('t("calendar_event_date")'));
  assert.ok(page.includes('t("calendar_time")'));
  assert.ok(page.includes('type="date" value={responsibilityDraftDate}'));
  assert.ok(page.includes('type="time" value={responsibilityDraftTime}'));
});

test("Planning V2.2.1 éloigne les marqueurs des libellés de timeline", () => {
  assert.ok(css.includes("DABO Planning V2.2.1"));
  assert.ok(css.includes("grid-template-columns:70px minmax(0,1fr);gap:26px"));
  assert.ok(css.includes("grid-template-columns:56px minmax(0,1fr);gap:23px"));
});

test("Planning V2.2.1 laisse respirer les préparations longues sur mobile", () => {
  assert.ok(css.includes("white-space:normal;overflow:visible;text-overflow:clip"));
  assert.ok(css.includes("flex-wrap:wrap"));
  assert.ok(css.includes("grid-template-columns:minmax(0,1fr) auto"));
});
