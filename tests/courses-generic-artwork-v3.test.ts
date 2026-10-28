import test from 'node:test';
import assert from 'node:assert/strict';
import { courseGenericArtwork, courseProductPhoto } from '../lib/courses-visual-catalog';

test('recognizes everyday items and multilingual equivalents without network', () => {
  for (const name of ['flocons de riz', 'rice flakes', 'rijstvlokken', 'copos de arroz']) assert.equal(courseGenericArtwork(name), '🥣');
  for (const name of ['antical', 'limescale remover', 'ontkalker']) assert.equal(courseGenericArtwork(name), '🧴');
  assert.equal(courseGenericArtwork('senteurs'), '🌸');
  assert.equal(courseGenericArtwork('2 kg pommes'), '🍎');
});

test('never guesses branded products or confuses close variants', () => {
  assert.equal(courseGenericArtwork('lait Alpro'), null);
  assert.equal(courseGenericArtwork('sauce tomate épicée'), null);
  assert.equal(courseGenericArtwork('riz'), null);
  assert.equal(courseGenericArtwork('objet inconnu'), null);
  assert.equal(courseProductPhoto('cotons tiges'), '/courses-art/v3-cotton-buds.svg');
  assert.equal(courseProductPhoto('contons tiges'), null);
});
