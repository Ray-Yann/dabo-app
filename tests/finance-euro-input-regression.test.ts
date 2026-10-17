import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../app/app/finances/page.tsx', import.meta.url), 'utf8');
const match = source.match(/function parseMoneyInput\(raw: string\) \{[\s\S]*?\n\}/);
assert.ok(match, 'Finance amount parser must exist');
const parse = new Function(`${match[0].replace("raw: string", "raw")}; return parseMoneyInput;`)() as (s: string) => number | null;

test('Finance accepts amounts formatted in the seven supported locales', () => {
  for (const locale of ['fr-BE','nl-BE','en-GB','de-DE','es-ES','it-IT','pt-PT']) {
    const formatted = new Intl.NumberFormat(locale, {style:'currency', currency:'EUR'}).format(1234.56);
    assert.equal(parse(formatted), 1234.56, `${locale}: ${formatted}`);
  }
});

test('Finance rejects invalid, zero, negative and excessive-precision amounts', () => {
  for (const input of ['', '0', '-2', '12,345', '1e3', 'abc']) assert.equal(parse(input), null, input);
});
