import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const tasksPage = fs.readFileSync("app/app/taches/page.tsx", "utf8");

test("Fluidité 5 — le formulaire de tâche possède un mode de détails facultatifs", () => {
  assert.match(tasksPage, /showTaskDetails/);
});

test("Fluidité 5 — les détails peuvent être affichés à la demande", () => {
  assert.match(tasksPage, /tasks_add_details/);
});

test("Fluidité 5 — les champs avancés sont conditionnés par le mode détails", () => {
  assert.match(
    tasksPage,
    /showTaskDetails\s*&&/
  );
});

test("Fluidité 5 — le nom et l'ajout restent disponibles indépendamment des détails", () => {
  assert.match(tasksPage, /task_name_placeholder/);
  assert.match(tasksPage, /addTask/);
});

