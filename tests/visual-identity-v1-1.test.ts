import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const tasks = fs.readFileSync("app/app/taches/page.tsx", "utf8");
const courses = fs.readFileSync("app/app/courses/page.tsx", "utf8");
const calendar = fs.readFileSync("app/app/calendrier/page.tsx", "utf8");
const nav = fs.readFileSync("components/DaboMainNav.tsx", "utf8");
const css = fs.readFileSync("app/globals.css", "utf8");

test("Visual Identity V1.1 fait des couleurs membres une signature secondaire discrÃ¨te", () => {
  assert.match(tasks, /memberColor\(members, group\.key\)/);
  assert.match(tasks, /dabo-member-task-group/);
  assert.match(css, /--dabo-member-accent/);
});

test("Visual Identity V1.1 donne une identitÃ© lÃ©gÃ¨re aux groupes magasins", () => {
  assert.match(courses, /dabo-store-heading/);
    assert.match(courses, /dabo-courses-store-monogram/);
  assert.match(courses, /storeMark\(storeLabel\)/);
});

test("Visual Identity V1.1 rÃ©chauffe le calendrier sans changer son contenu", () => {
  assert.match(calendar, /dabo-calendar-event-shared/);
  assert.match(calendar, /dabo-calendar-event-personal/);
  assert.match(css, /dabo-calendar-event-today/);
});

test("Visual Identity V2 protÃ¨ge les cinq libellÃ©s sur mobile", () => {
  assert.match(nav, /dabo-main-nav-v2/);
  assert.match(css, /text-overflow:ellipsis/);
  assert.match(css, /white-space:nowrap/);
});
