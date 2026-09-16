import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const tasksPage = fs.readFileSync("app/app/taches/page.tsx", "utf8");
const completion = fs.readFileSync("lib/task-completion.ts", "utf8");
const contributions = fs.readFileSync("lib/task-contributions.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260917_task_subtasks_v1.sql", "utf8");
const i18n = fs.readFileSync("lib/i18n.ts", "utf8");

test("Sous-tÃ¢ches V1 persiste des Ã©tapes assignables et ordonnÃ©es avec RLS foyer", () => {
  assert.match(migration, /create table if not exists public\.task_subtasks/);
  assert.match(migration, /assigned_to uuid references public\.members/);
  assert.match(migration, /task_id uuid not null references public\.tasks\(id\) on delete cascade/);
  assert.match(migration, /enable row level security/);
});

test("Sous-tÃ¢ches V1 affiche la tÃ¢che principale dans chaque groupe concernÃ© avec seulement ses Ã©tapes", () => {
  assert.match(tasksPage, /taskSubs\.filter\(\(item\) => item\.assigned_to === member\.id\)/);
  assert.match(tasksPage, /visibleSubtasks\.map/);
  assert.match(tasksPage, /groupEntries/);
});

test("Sous-tÃ¢ches V1 calcule automatiquement l'attribution principale", () => {
  assert.match(tasksPage, /subtaskAssignees\.length === 1/);
  assert.match(tasksPage, /subtasks_assignment_auto/);
  assert.match(tasksPage, /task_shared/);
});

test("Sous-tÃ¢ches V1 termine la mission quand toutes les Ã©tapes sont terminÃ©es", () => {
  assert.match(tasksPage, /all\.every\(\(row\) => Boolean\(row\.completed_at\)\)/);
  assert.match(tasksPage, /completeHouseholdTask\([^;]*[\s\S]*?performerIds, weights\)/);
});

test("Sous-tÃ¢ches V1 rÃ©partit les points selon le nombre d'Ã©tapes rÃ©ellement rÃ©alisÃ©es", () => {
  assert.match(completion, /performerWeights/);
  assert.match(contributions, /participant\.share_weight/);
  assert.match(contributions, /contribution\.weight_points \* ratio/);
});

test("Sous-tÃ¢ches V1 recrÃ©e les Ã©tapes dÃ©cochÃ©es Ã  la prochaine occurrence", () => {
  assert.match(completion, /from\("task_subtasks"\)[\s\S]+select\("name, assigned_to, position"\)/);
  assert.match(completion, /task_id: nextTask\.id/);
  assert.doesNotMatch(completion, /task_id: nextTask\.id,[\s\S]{0,180}completed_at/);
});

test("Sous-tÃ¢ches V1 couvre les sept catalogues DABO", () => {
  assert.equal((i18n.match(/subtasks_title:/g) || []).length, 7);
  assert.equal((i18n.match(/subtasks_assignment_auto:/g) || []).length, 7);
});

