import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const i18n = fs.readFileSync("lib/i18n.ts", "utf8");
const languages = fs.readFileSync("lib/languages.ts", "utf8");
const types = fs.readFileSync("lib/types.ts", "utf8");
const countries = fs.readFileSync("lib/countries.ts", "utf8");
const migration = fs.readFileSync("supabase-migrations/2026-09-10-internationalisation-v2-1-seven-languages.sql", "utf8");

function extractLanguageCatalog(lang: string): Record<string, string> {
  const startMatch = new RegExp(`\\b${lang}:\\s*\\{`).exec(i18n);
  assert.ok(startMatch, `bloc ${lang} présent`);

  const open = startMatch.index + startMatch[0].length - 1;
  let depth = 1;
  let quote: string | null = null;
  let escaped = false;
  let i = open + 1;

  for (; i < i18n.length && depth > 0; i += 1) {
    const c = i18n[i];

    if (quote) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === quote) quote = null;
      continue;
    }

    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "{") depth += 1;
    else if (c === "}") depth -= 1;
  }

  assert.equal(depth, 0, `bloc ${lang} correctement fermé`);
  const body = i18n.slice(open + 1, i - 1);

  try {
    return Function(`"use strict"; return ({${body}});`)() as Record<string, string>;
  } catch (error) {
    assert.fail(`catalogue ${lang} illisible: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function placeholders(value: string) {
  return [...value.matchAll(/\{[A-Za-z0-9_]+\}/g)].map((match) => match[0]).sort();
}

test("Internationalisation V2.1 active sept langues réelles", () => {
  assert.match(i18n, /export type Lang = "fr" \| "nl" \| "en" \| "de" \| "es" \| "it" \| "pt";/);

  for (const code of ["de", "es", "it", "pt"]) {
    assert.match(languages, new RegExp(`code: "${code}"[^\\n]+available: true`));
  }

  assert.match(types, /language: "fr" \| "nl" \| "en" \| "de" \| "es" \| "it" \| "pt";/);
});

test("Internationalisation V2.1 exige exactement les mêmes entrées dans chacun des sept catalogues", () => {
  const langs = ["fr", "nl", "en", "de", "es", "it", "pt"];
  const reference = extractLanguageCatalog("fr");
  const referenceKeys = Object.keys(reference).sort();

  assert.ok(referenceKeys.length > 0, "le catalogue FR ne doit pas être vide");

  for (const lang of langs) {
    const catalog = extractLanguageCatalog(lang);
    const keys = Object.keys(catalog).sort();

    assert.equal(
      keys.length,
      referenceKeys.length,
      `${lang} doit avoir ${referenceKeys.length} entrées`
    );
    assert.deepEqual(keys, referenceKeys, `${lang} doit avoir exactement les mêmes clés que FR`);

    for (const key of referenceKeys) {
      assert.equal(typeof catalog[key], "string", `${lang}.${key} doit être une chaîne`);
      assert.ok(catalog[key].trim().length > 0, `${lang}.${key} ne doit pas être vide`);
      assert.deepEqual(
        placeholders(catalog[key]),
        placeholders(reference[key]),
        `${lang}.${key} doit préserver exactement les placeholders`
      );
    }
  }
});

test("Internationalisation V2.1 adapte pays et stockage membres aux nouvelles langues", () => {
  assert.match(countries, /de: "de"/);
  assert.match(countries, /es: "es"/);
  assert.match(countries, /it: "it"/);
  assert.match(countries, /pt: "pt-PT"/);

  for (const code of ["de", "es", "it", "pt"]) {
    assert.match(migration, new RegExp(`'${code}'::text`));
  }
});
