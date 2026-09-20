import fs from "node:fs";

const path = "scripts/check-i18n.mjs";
if (!fs.existsSync(path)) throw new Error(`Fichier introuvable: ${path}`);

let src = fs.readFileSync(path, "utf8");

// Replace the current checker entirely with a robust parser that evaluates
// each top-level language object from lib/i18n.ts rather than counting
// one key per source line.
const next = `import fs from "node:fs";

const i18nSource = fs.readFileSync("lib/i18n.ts", "utf8");
const langs = ["fr", "nl", "en", "de", "es", "it", "pt"];

function extractCatalog(lang) {
  const startMatch = new RegExp("\\\\b" + lang + ":\\\\s*\\\\{").exec(i18nSource);
  if (!startMatch) throw new Error("[i18n] bloc " + lang + " introuvable");

  const open = startMatch.index + startMatch[0].length - 1;
  let depth = 1;
  let quote = null;
  let escaped = false;
  let i = open + 1;

  for (; i < i18nSource.length && depth > 0; i += 1) {
    const c = i18nSource[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === "\\\\\\\\") escaped = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "\\"" || c === "'" || c === "\\\\\`") quote = c;
    else if (c === "{") depth += 1;
    else if (c === "}") depth -= 1;
  }

  if (depth !== 0) throw new Error("[i18n] bloc " + lang + " mal fermé");
  const body = i18nSource.slice(open + 1, i - 1);
  return Function('"use strict"; return ({' + body + '});')();
}

function placeholders(value) {
  return [...String(value).matchAll(/\\\\{[A-Za-z0-9_]+\\\\}/g)]
    .map((match) => match[0])
    .sort();
}

const catalogs = Object.fromEntries(langs.map((lang) => [lang, extractCatalog(lang)]));
const reference = catalogs.fr;
const referenceKeys = Object.keys(reference).sort();
let failed = false;

for (const lang of langs) {
  const catalog = catalogs[lang];
  const keys = Object.keys(catalog).sort();
  const missing = referenceKeys.filter((key) => !(key in catalog));
  const extra = keys.filter((key) => !(key in reference));

  if (missing.length || extra.length || keys.length !== referenceKeys.length) {
    failed = true;
    console.error("\\\\n[i18n] " + lang + ": catalogue incomplet/incohérent (" + keys.length + "/" + referenceKeys.length + ")");
    for (const key of missing) console.error("  - manquant: " + key);
    for (const key of extra) console.error("  - en trop: " + key);
    continue;
  }

  for (const key of referenceKeys) {
    const value = catalog[key];
    if (typeof value !== "string" || value.trim() === "") {
      failed = true;
      console.error("\\\\n[i18n] " + lang + "." + key + ": traduction vide ou invalide");
      continue;
    }
    const expected = placeholders(reference[key]);
    const actual = placeholders(value);
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      failed = true;
      console.error("\\\\n[i18n] " + lang + "." + key + ": placeholders différents");
      console.error("  FR: " + expected.join(", "));
      console.error("  " + lang.toUpperCase() + ": " + actual.join(", "));
    }
  }
}

if (failed) process.exit(1);

console.log(
  "[i18n] OK — " +
    referenceKeys.length +
    " clés catalogues vérifiées en FR/NL/EN/DE/ES/IT/PT, avec parité des clés et placeholders."
);
`;

fs.writeFileSync(path, next, "utf8");
console.log("✅ scripts/check-i18n.mjs actualisé.");
console.log("➡️ Lance maintenant: npm run verify");
