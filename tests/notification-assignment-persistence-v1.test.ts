import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const tasks = fs.readFileSync("app/app/taches/page.tsx", "utf8");

test("Assignment Persistence V1 controle l insertion des sous-taches a la creation", () => {
  assert.match(
    tasks,
    /error:\s*subtaskInsertError/
  );
  assert.match(
    tasks,
    /taskAssignmentsPersisted/
  );
});

test("Assignment Persistence V1 controle la suppression des anciennes sous-taches", () => {
  assert.match(
    tasks,
    /error:\s*subtaskDeleteError/
  );
});

test("Assignment Persistence V1 controle la reinsertion des sous-taches modifiees", () => {
  const matches = tasks.match(/error:\s*subtaskInsertError/g) || [];
  assert.ok(
    matches.length >= 2,
    "La creation et la modification doivent toutes deux controler l erreur d insertion des sous-taches."
  );
});

test("Assignment Persistence V1 ne notifie une attribution qu apres persistance complete", () => {
  assert.match(
    tasks,
    /if \(taskAssignmentsPersisted && me\)/
  );
  assert.match(
    tasks,
    /if \(taskSubtasksPersisted && household && me\)/
  );
});
