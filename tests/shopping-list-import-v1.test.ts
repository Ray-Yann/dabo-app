import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const parserPath = "lib/shopping-list-import.ts";

test("Fluidité 4 — le parseur d'import rapide existe", () => {
  assert.equal(fs.existsSync(parserPath), true);
});

test("Fluidité 4 — transforme chaque ligne non vide en article", async () => {
  const { parseShoppingListImport } = await import("../lib/shopping-list-import");

  assert.deepEqual(
    parseShoppingListImport("Lait\nPain\n\nTomates\nPoulet"),
    ["Lait", "Pain", "Tomates", "Poulet"]
  );
});

test("Fluidité 4 — nettoie les espaces et les marqueurs de liste courants", async () => {
  const { parseShoppingListImport } = await import("../lib/shopping-list-import");

  assert.deepEqual(
    parseShoppingListImport("  - Lait  \n• Pain\n* Tomates\n☐ Poulet\n☑ Riz"),
    ["Lait", "Pain", "Tomates", "Poulet", "Riz"]
  );
});

test("Fluidité 4 — une saisie vide ne crée aucun article", async () => {
  const { parseShoppingListImport } = await import("../lib/shopping-list-import");

  assert.deepEqual(parseShoppingListImport(" \n\n   "), []);
});

const coursesPage = fs.readFileSync("app/app/courses/page.tsx", "utf8");

test("Fluidité 4 — Courses importe le parseur de liste", () => {
  assert.match(
    coursesPage,
    /import\s+\{\s*parseShoppingListImport\s*\}\s+from\s+["']@\/lib\/shopping-list-import["']/
  );
});

test("Fluidité 4 — Courses possède un mode dédié pour coller une liste", () => {
  assert.match(coursesPage, /showBulkImport/);
  assert.match(coursesPage, /bulkImportText/);
  assert.match(coursesPage, /<textarea/);
});

test("Fluidité 4 — l'import utilise le parseur et une insertion groupée dans shopping_items", () => {
  assert.match(coursesPage, /parseShoppingListImport\(bulkImportText\)/);
  assert.match(
    coursesPage,
    /from\(["']shopping_items["']\)\.insert\(/
  );
});

test("Fluidité 4 — un import réussi vide le texte et ferme le mode liste", () => {
  assert.match(coursesPage, /setBulkImportText\(["']["']\)/);
  assert.match(coursesPage, /setShowBulkImport\(false\)/);
});

