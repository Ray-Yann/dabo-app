import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const onboarding = fs.readFileSync("app/page.tsx", "utf8");
const guidance = fs.readFileSync("lib/first-value-guidance.ts", "utf8");
const tasks = fs.readFileSync("app/app/taches/page.tsx", "utf8");
const shopping = fs.readFileSync("app/app/courses/page.tsx", "utf8");
const calendar = fs.readFileSync("app/app/calendrier/page.tsx", "utf8");
const i18n = fs.readFileSync("lib/i18n.ts", "utf8");

test("P4.3 propose trois premières actions utiles après création du foyer", () => {
  assert.match(onboarding, /onboarding_first_value_title/);
  assert.match(onboarding, /onboarding_first_value_task/);
  assert.match(onboarding, /onboarding_first_value_shopping/);
  assert.match(onboarding, /onboarding_first_value_calendar/);
  assert.match(onboarding, /householdType !== "solo"/);
});

test("P4.3 reste dans l'état created et ne s'impose pas au parcours join", () => {
  const createdStart = onboarding.indexOf('setupMode === "created"');
  assert.notEqual(createdStart, -1);

  const firstValueStart = onboarding.indexOf("onboarding_first_value_title");
  assert.ok(
    firstValueStart > createdStart,
    "Le guidage First Value doit être rendu dans le parcours du foyer créé."
  );

  const joinAction = onboarding.indexOf('setSetupMode("join")');
  assert.notEqual(joinAction, -1);
  assert.ok(
    joinAction < createdStart,
    "Le parcours join doit rester distinct du guidage post-création."
  );
});

test("P4.3 mémorise le choix uniquement pour la session courante", () => {
  assert.match(guidance, /sessionStorage\.setItem/);
  assert.match(guidance, /sessionStorage\.getItem/);
  assert.match(guidance, /sessionStorage\.removeItem/);
  assert.doesNotMatch(guidance, /localStorage/);
});

test("P4.3 mémorise le type avant de naviguer vers le vrai écran", () => {
  for (const [type, route] of [
    ["task", "/app/taches?first=1"],
    ["shopping", "/app/courses?first=1"],
    ["calendar", "/app/calendrier?first=1"],
  ]) {
    const start = onboarding.indexOf(`startFirstValueGuidance("${type}")`);
    const navigate = onboarding.indexOf(`router.replace("${route}")`, start);

    assert.notEqual(start, -1);
    assert.ok(navigate > start);
  }
});

test("P4.3 ouvre automatiquement les trois vrais formulaires puis nettoie l'URL", () => {
  for (const source of [tasks, shopping, calendar]) {
    assert.match(source, /url\.searchParams\.get\("first"\) !== "1"/);
    assert.match(source, /url\.searchParams\.delete\("first"\)/);
    assert.match(source, /window\.history\.replaceState/);
    assert.match(source, /setShowAdd\(true\)/);
  }

  assert.match(tasks, /setView\("to_do"\)/);
  assert.match(shopping, /setView\("to_buy"\)/);
  assert.match(calendar, /setView\("upcoming"\)/);
  assert.match(calendar, /setNewVisibility\("household"\)/);
});

test("P4.3 conserve first_value comme source analytics existante", () => {
  assert.match(
    tasks,
    /trackAcquisitionEvent\("first_value", \{ householdId: household\.id, valueType: "task" \}\)/
  );
  assert.match(
    shopping,
    /trackAcquisitionEvent\("first_value", \{ householdId: household\.id, valueType: "shopping" \}\)/
  );
  assert.match(
    calendar,
    /trackAcquisitionEvent\("first_value", \{ householdId: household\.id, valueType: "calendar" \}\)/
  );
});

test("P4.3 ne consomme l'intention tâche et courses qu'après insertion réussie", () => {
  assert.match(
    tasks,
    /if \(!taskInsertError\) \{[\s\S]*?completeFirstValueGuidance\("task"\)/
  );
  assert.match(
    shopping,
    /if \(!shoppingInsertError\) \{[\s\S]*?completeFirstValueGuidance\("shopping"\)/
  );
});

test("P4.3 consomme l'intention calendrier après le garde-fou d'erreur", () => {
  const errorGuard = calendar.indexOf("if (error) {");
  const completion = calendar.indexOf('completeFirstValueGuidance("calendar")');

  assert.notEqual(errorGuard, -1);
  assert.ok(
    completion > errorGuard,
    "La réussite First Value calendrier doit arriver après le traitement d'erreur."
  );
});

test("P4.3 affiche la reconnaissance uniquement quand le guidage est réellement consommé", () => {
  for (const [source, type] of [
    [tasks, "task"],
    [shopping, "shopping"],
    [calendar, "calendar"],
  ]) {
    assert.match(
      source,
      new RegExp(
        `if \\(completeFirstValueGuidance\\("${type}"\\)\\) \\{[\\s\\S]*?setFirstValueConfirmation\\(true\\)`
      )
    );
    assert.match(source, /onboarding_first_value_confirmation/);
    assert.match(source, /aria-live="polite"/);
  }
});

test("P4.3 possède son contrat i18n complet sans créer de données fictives", () => {
  for (const key of [
    "onboarding_first_value_title",
    "onboarding_first_value_body",
    "onboarding_first_value_task",
    "onboarding_first_value_shopping",
    "onboarding_first_value_calendar",
    "onboarding_first_value_confirmation",
  ]) {
    assert.match(i18n, new RegExp(key));
  }

  assert.doesNotMatch(onboarding, /createDemoTask|createDemoShopping|createDemoEvent/i);
});
