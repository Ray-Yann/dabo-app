import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const smart = fs.readFileSync("components/SmartNameInput.tsx", "utf8");
const tasks = fs.readFileSync("app/app/taches/page.tsx", "utf8");
const courses = fs.readFileSync("app/app/courses/page.tsx", "utf8");

test("iOS Input Performance V1 garde la frappe du champ intelligent dans un état local prioritaire", () => {
  assert.match(smart, /const \[draft, setDraft\] = useState\(value\)/);
  assert.match(smart, /value=\{draft\}/);
  assert.match(smart, /setDraft\(nextValue\)/);
});

test("iOS Input Performance V1 reporte le rendu lourd du parent hors de la frappe urgente", () => {
  assert.match(smart, /startTransition\(\(\) => onChange\(nextValue\)\)/);
  assert.match(smart, /useDeferredValue\(draft\)/);
});

test("iOS Input Performance V1 calcule les suggestions sur la valeur différée", () => {
  assert.match(smart, /getSmartSuggestions\(deferredDraft/);
});

test("iOS Input Performance V1 diffère aussi les recherches d'historique lourdes", () => {
  assert.match(tasks, /useDeferredValue\(doneSearch\)/);
  assert.match(tasks, /includes\(deferredDoneSearch\.trim\(\)\.toLowerCase\(\)\)/);
  assert.match(courses, /useDeferredValue\(boughtSearch\)/);
  assert.match(courses, /includes\(deferredBoughtSearch\.toLowerCase\(\)\)/);
});
