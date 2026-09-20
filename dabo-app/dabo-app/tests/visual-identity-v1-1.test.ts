import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const tasks = fs.readFileSync("app/app/taches/page.tsx", "utf8");
const courses = fs.readFileSync("app/app/courses/page.tsx", "utf8");
const calendar = fs.readFileSync("app/app/calendrier/page.tsx", "utf8");
const nav = fs.readFileSync("components/DaboMainNav.tsx", "utf8");
const css = fs.readFileSync("app/globals.css", "utf8");

test("Visual Identity V1.1 fait des couleurs membres une signature secondaire discrète", () => {
  assert.match(tasks, /memberColor\(members, group\.key\)/);
  assert.match(tasks, /dabo-member-task-group/);
  assert.match(css, /--dabo-member-accent/);
});

test("Visual Identity V1.1 donne une identité légère aux groupes magasins", () => {
  assert.match(courses, /dabo-store-heading/);
  assert.match(courses, /<Store size=\{13\}/);
});

test("Visual Identity V1.1 réchauffe le calendrier sans changer son contenu", () => {
  assert.match(calendar, /dabo-calendar-event-shared/);
  assert.match(calendar, /dabo-calendar-event-personal/);
  assert.match(css, /dabo-calendar-event-today/);
});

test("Visual Identity V1.1 protège le libellé Calendrier sur mobile", () => {
  assert.match(nav, /dabo-main-nav-label-calendar/);
  assert.match(css, /white-space: nowrap/);
});
