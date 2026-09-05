import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_DIRS = ["app", "components", "lib"];
const EXTENSIONS = new Set([".ts", ".tsx"]);
const CALL_RE = /(?<![A-Za-z0-9_])(t|translate|translateWithParams)\(\s*["']([^"']+)["']/g;

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (EXTENSIONS.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

const usedKeys = new Set();
for (const sourceDir of SOURCE_DIRS) {
  for (const file of walk(path.join(ROOT, sourceDir))) {
    const content = fs.readFileSync(file, "utf8");
    for (const match of content.matchAll(CALL_RE)) usedKeys.add(match[2]);
  }
}

const i18nPath = path.join(ROOT, "lib", "i18n.ts");
const i18n = fs.readFileSync(i18nPath, "utf8");

function extractLanguageKeys(lang) {
  const startMatch = new RegExp(`\\b${lang}:\\s*\\{`).exec(i18n);
  if (!startMatch) throw new Error(`Bloc i18n introuvable: ${lang}`);
  let depth = 1;
  let i = startMatch.index + startMatch[0].length;
  const start = i;
  for (; i < i18n.length && depth > 0; i += 1) {
    if (i18n[i] === "{") depth += 1;
    else if (i18n[i] === "}") depth -= 1;
  }
  const block = i18n.slice(start, i - 1);
  return new Set([...block.matchAll(/^\s*([A-Za-z0-9_]+):/gm)].map((match) => match[1]));
}

let failed = false;
for (const lang of ["fr", "nl", "en"]) {
  const defined = extractLanguageKeys(lang);
  const missing = [...usedKeys].filter((key) => !defined.has(key)).sort();
  if (missing.length > 0) {
    failed = true;
    console.error(`\n[i18n] ${lang}: ${missing.length} clé(s) manquante(s)`);
    for (const key of missing) console.error(`  - ${key}`);
  }
}

if (failed) process.exit(1);
console.log(`[i18n] OK — ${usedKeys.size} clés statiques vérifiées en FR/NL/EN.`);
