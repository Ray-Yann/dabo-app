import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { courseProductPhoto } from '../lib/courses-visual-catalog';

const expected: Record<string, string> = {
  '6 œufs bio': 'catalog-egg.webp',
  'Œufs frais': 'catalog-egg.webp',
  'Lait demi-écrémé': 'catalog-milk.webp',
  '2 kg de pommes de terre': 'catalog-potato.webp',
  'Pommes de terre 2 kg': 'catalog-potato.webp',
  'Riz basmati 1 kg': 'catalog-rice.webp',
  'Filet de saumon': 'catalog-salmon.webp',
  '6 organic eggs': 'catalog-egg.webp',
  'Halfvolle melk': 'catalog-milk.webp',
  'Voll milch': 'catalog-milk.webp',
  'Huevos frescos': 'catalog-egg.webp',
  'Uova fresche': 'catalog-egg.webp',
  'Leite integral': 'catalog-milk.webp',
  '2 x 500 g riz': 'catalog-rice.webp',
};

test('Courses V2 handles approved variants and quantities across seven languages', () => {
  for (const [name, file] of Object.entries(expected)) {
    const actual = courseProductPhoto(name);
    assert.equal(actual, `/courses-art/${file}`, name);
    assert.ok(existsSync(`public${actual}`), `${name}: missing asset`);
  }
});

test('Courses V2 does not invent pictures for ambiguous, branded or unrelated products', () => {
  for (const name of [
    'Sauce tomate épicée', 'Flocons de riz', 'Lait Alpro',
    'Lait chocolat', 'Lait de coco', 'Batata', 'Patate douce',
    'Œufs chocolat', 'Tomates séchées', 'Filet de saumon fumé',
  ]) assert.equal(courseProductPhoto(name), null, name);
});

test('Courses V2 every curated product artwork exists', () => {
  const source = readFileSync('lib/courses-visual-catalog.ts', 'utf8');
  const paths = [...source.matchAll(/path: '(\/courses-art\/catalog-[^']+\.webp)'/g)].map(match => match[1]);
  assert.equal(paths.length, 33);
  for (const path of paths) assert.ok(existsSync(`public${path}`), `Missing: ${path}`);
});
