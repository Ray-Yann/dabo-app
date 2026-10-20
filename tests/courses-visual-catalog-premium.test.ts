import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { courseProductPhoto } from "../lib/courses-visual-catalog";

const cases: Record<string, string> = {
  "Riz": "catalog-rice.webp",
  "Microfibre": "catalog-microfiber.webp",
  "Liquide vaisselle": "catalog-dish-soap.webp",
  "Serviettes hygiéniques": "catalog-sanitary-pads.webp",
  "Tomates": "catalog-tomato.webp",
  "Sauce tomate": "catalog-tomato-sauce.webp",
  "Tomates cerises": "catalog-cherry-tomato.webp",
  "Lait": "catalog-milk.webp",
  "Lait d'amande": "catalog-almond-milk.webp",
  "Lait d'avoine": "catalog-oat-milk.webp",
  "Lait de soja": "catalog-soy-milk.webp",
  "Riz basmati": "catalog-rice.webp",
};

test("Courses catalogue matches actual household names and files", () => {
  for (const [name, file] of Object.entries(cases)) {
    const path = courseProductPhoto(name);
    assert.equal(path, `/courses-art/${file}`, name);
    assert.ok(existsSync(`public${path}`), `${name}: asset missing`);
  }
});

test("Courses avoids visually misleading matches", () => {
  for (const name of ["Flocons de riz", "Contons tiges", "Lait Alpro", "Sauce tomate épicée"]) {
    assert.equal(courseProductPhoto(name), null, name);
  }
});

test("Courses visual component uses a fallback when an image fails", () => {
  const page = readFileSync("app/app/courses/page.tsx", "utf8");
  assert.match(page, /function CourseProductVisual/);
  assert.match(page, /onError=\{\(\) => setFailedPath\(photo\)\}/);
  assert.match(page, /<CourseProductVisual name=\{item.name\} \/>/);
});
