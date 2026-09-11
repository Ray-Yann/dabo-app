import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync("app/globals.css", "utf8");
const tasks = fs.readFileSync("app/app/taches/page.tsx", "utf8");
const courses = fs.readFileSync("app/app/courses/page.tsx", "utf8");
const calendar = fs.readFileSync("app/app/calendrier/page.tsx", "utf8");
const attention = fs.readFileSync("components/dabo/AttentionCard.tsx", "utf8");
const empty = fs.readFileSync("components/dabo/EmptyState.tsx", "utf8");

test("Brand Language V1.1 fait entrer la signature DABO dans Tâches et Courses", () => {
  assert.match(tasks, /dabo-organic-header/);
  assert.match(tasks, /dabo-brand-orbit/);
  assert.match(courses, /dabo-organic-header/);
  assert.match(courses, /dabo-brand-orbit/);
});

test("Brand Language V1.1 donne une silhouette asymétrique aux actions principales", () => {
  assert.match(tasks, /dabo-primary-action/);
  assert.match(courses, /dabo-primary-action/);
  assert.match(calendar, /dabo-primary-action/);
  assert.match(css, /border-radius: 14px 14px 5px 14px/);
});

test("Brand Language V1.1 transforme les surfaces clés plutôt que de multiplier le logo", () => {
  assert.match(attention, /dabo-organic-card/);
  assert.match(empty, /dabo-empty-state/);
  assert.match(css, /border-radius: 22px 22px 8px 22px/);
});

test("Brand Language V1.1 garde le point solaire réservé aux repères DABO", () => {
  assert.match(css, /Le point solaire est réservé aux repères DABO/);
  const memberAccentRule = css.match(/\.dabo-member-task-group\[style\]::before\s*\{[^}]*\}/)?.[0] ?? "";
  const memberHoverRule = css.match(/\.dabo-member-task-group\[style\] \.dabo-task-row:hover\s*\{[^}]*\}/)?.[0] ?? "";

  assert.match(memberAccentRule, /var\(--dabo-member-accent\)/);
  assert.match(memberHoverRule, /var\(--dabo-member-accent\)/);
  assert.doesNotMatch(memberAccentRule, /mustard/);
  assert.doesNotMatch(memberHoverRule, /mustard/);
});
