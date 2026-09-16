import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const nativeInput = fs.readFileSync("components/NativeNameInput.tsx", "utf8");
const tasks = fs.readFileSync("app/app/taches/page.tsx", "utf8");
const courses = fs.readFileSync("app/app/courses/page.tsx", "utf8");

test("Native Input V1 retire SmartNameInput de Tâches et Courses", () => {
  assert.doesNotMatch(tasks, /SmartNameInput/);
  assert.doesNotMatch(courses, /SmartNameInput/);
  assert.match(tasks, /NativeNameInput/);
  assert.match(courses, /NativeNameInput/);
});

test("Native Input V1 ne propage plus chaque frappe vers les grosses pages parentes", () => {
  assert.match(nativeInput, /onChange=\{\(event\) => setDraft\(event\.target\.value\)\}/);
  assert.doesNotMatch(nativeInput, /startTransition/);
  assert.doesNotMatch(nativeInput, /useDeferredValue/);
  assert.match(nativeInput, /onBlur=\{commit\}/);
});

test("Native Input V1 laisse les aides de saisie au clavier du terminal", () => {
  assert.match(nativeInput, /autoCorrect="on"/);
  assert.match(nativeInput, /autoCapitalize="sentences"/);
  assert.match(nativeInput, /spellCheck/);
});

test("Native Input V1 retire les lectures croisées uniquement destinées au dictionnaire DABO", () => {
  assert.doesNotMatch(tasks, /shoppingNameSuggestions/);
  assert.doesNotMatch(courses, /taskNameSuggestions/);
});
