import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const courses = fs.readFileSync("app/app/courses/page.tsx", "utf8");
const tasks = fs.readFileSync("app/app/taches/page.tsx", "utf8");
const calendar = fs.readFileSync("app/app/calendrier/page.tsx", "utf8");
const home = fs.readFileSync("app/app/page.tsx", "utf8");

test("UX Light V1.1 retire Promos de Courses", () => { assert.ok(!courses.includes("PromosView")); assert.ok(!courses.includes('setView("promos")')); });
test("UX Light V1.1 donne trois vues exclusives à Courses", () => { for (const value of ["to_buy", "suggestions", "history"]) assert.ok(courses.includes(value)); });
test("UX Light V1.1 donne trois vues exclusives à Tâches", () => { for (const value of ["to_do", "routines", "done"]) assert.ok(tasks.includes(value)); });
test("UX Light V1.1 allège Calendrier avec À venir, Mois et Personnel", () => { for (const value of ["upcoming", "month", "personal"]) assert.ok(calendar.includes(value)); assert.ok(calendar.includes("monthCells")); });
test("UX Light V1.1 conserve Finances comme destination de la vue rapide", () => { assert.ok(home.includes('href: "/app/finances"')); });
