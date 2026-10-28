import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import { courseProductPhoto } from '../lib/courses-visual-catalog';

const matches: Record<string, string> = {
  'Cotons-tiges': 'v3-cotton-buds.svg',
  'Cotton swabs': 'v3-cotton-buds.svg',
  'Wattestäbchen': 'v3-cotton-buds.svg',
  'Bastoncillos de algodón': 'v3-cotton-buds.svg',
  'Cotonetes': 'v3-cotton-buds.svg',
  'Ciseaux': 'v3-scissors.svg',
  'Scissors': 'v3-scissors.svg',
  'Schere': 'v3-scissors.svg',
  'Tijeras': 'v3-scissors.svg',
  'Forbici': 'v3-scissors.svg',
  'Tesouras': 'v3-scissors.svg',
  'Désodorisant': 'v3-air-freshener.svg',
  'Air freshener': 'v3-air-freshener.svg',
  'Luchtverfrisser': 'v3-air-freshener.svg',
  'Ambientador': 'v3-air-freshener.svg',
};

test('Courses V3 matches new editorial illustrations and bundled files', () => {
  for (const [name, filename] of Object.entries(matches)) {
    const actual = courseProductPhoto(name);
    assert.equal(actual, `/courses-art/${filename}`, name);
    assert.ok(existsSync(`public${actual}`), `Missing artwork for ${name}`);
  }
});

test('Courses V3 retains conservative matching and all existing photo identities', () => {
  for (const name of ['Cotons démaquillants', 'Ciseaux à ongles', 'Désodorisant voiture', 'Parfum', 'Lait Alpro', 'Tomates séchées']) {
    assert.equal(courseProductPhoto(name), null, name);
  }
  assert.equal(courseProductPhoto('Riz'), '/courses-art/catalog-rice.webp');
  assert.equal(courseProductPhoto('Lait d’amande'), '/courses-art/catalog-almond-milk.webp');
  assert.equal(courseProductPhoto('Microfibre'), '/courses-art/catalog-microfiber.webp');
});
