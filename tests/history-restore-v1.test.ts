import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const tasksPage = fs.readFileSync("app/app/taches/page.tsx", "utf8");
const shoppingPage = fs.readFileSync("app/app/courses/page.tsx", "utf8");
const taskCompletion = fs.readFileSync("lib/task-completion.ts", "utf8");
const i18n = fs.readFileSync("lib/i18n.ts", "utf8");

test("une tâche terminée propose explicitement de la remettre à faire", () => {
  assert.match(tasksPage, /task_history_restore/);
  assert.match(tasksPage, /task_history_restore_help/);
  assert.match(tasksPage, /void uncompleteTask\(task\)/);
});

test("le check visuel d'une tâche historique n'est plus une action de restauration", () => {
  assert.doesNotMatch(
    tasksPage,
    /onClick=\{\(\) => uncompleteTask\(task\)\} className="w-5 h-5 rounded-full bg-ink/
  );
});

test("la restauration d'une tâche réutilise le moteur de dévalidation existant", () => {
  assert.match(tasksPage, /uncompleteHouseholdTask/);
  assert.match(taskCompletion, /export async function uncompleteHouseholdTask/);
  assert.match(taskCompletion, /task_contributions/);
});

test("une course achetée propose explicitement de la remettre à acheter", () => {
  assert.match(shoppingPage, /courses_history_restore/);
  assert.match(shoppingPage, /courses_history_restore_help/);
  assert.match(shoppingPage, /actionItem\.status === "bought"/);
  assert.match(shoppingPage, /void toggle\(actionItem\)/);
});

test("la restauration d'une course réutilise le RPC canonique et le statut to_buy", () => {
  assert.match(shoppingPage, /const status = goingToBought \? "bought" : "to_buy"/);
  assert.match(shoppingPage, /dabo_set_shopping_item_status/);
});

test("le check visuel d'une course historique n'est plus cliquable pour restaurer", () => {
  assert.doesNotMatch(
    shoppingPage,
    /onClick=\{\(\) => toggle\(item\)\} className="w-5 h-5 rounded-full bg-ink/
  );
});

test("l'historique des courses ouvre des actions explicites au lieu d'une suppression directe", () => {
  assert.match(shoppingPage, /setActionItemId\(item\.id\)/);
  assert.match(shoppingPage, /courses_item_more_actions/);
});

test("les libellés de restauration existent dans les sept catalogues de langue", () => {
  for (const key of [
    "task_history_restore",
    "task_history_restore_help",
    "courses_history_restore",
    "courses_history_restore_help",
  ]) {
    const matches = i18n.match(new RegExp(key + ":", "g")) ?? [];
    assert.equal(matches.length, 7, key + " doit exister dans les 7 langues");
  }
});
