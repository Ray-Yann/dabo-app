import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const API_KEY = process.env.DEEPL_API_KEY;
const API_URL = "https://api-free.deepl.com/v2/translate";
const TARGETS = [
  { code: "de", deepl: "DE", label: "Deutsch" },
  { code: "es", deepl: "ES", label: "Español" },
  { code: "it", deepl: "IT", label: "Italiano" },
  { code: "pt", deepl: "PT-PT", label: "Português" },
];
const BATCH_SIZE = 40;

if (!API_KEY) {
  console.error("❌ DEEPL_API_KEY absente. Charge la clé dans cette même fenêtre PowerShell puis relance.");
  process.exit(1);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}
function write(rel, value) {
  fs.writeFileSync(path.join(ROOT, rel), value, "utf8");
}

function findLanguageBlock(source, lang) {
  const re = new RegExp(`\\b${lang}:\\s*\\{`);
  const match = re.exec(source);
  if (!match) throw new Error(`Bloc i18n introuvable: ${lang}`);
  const open = match.index + match[0].length - 1;
  let depth = 1;
  let quote = null;
  let escaped = false;
  let i = open + 1;
  for (; i < source.length && depth > 0; i += 1) {
    const c = source[i];
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
  if (depth !== 0) throw new Error(`Bloc i18n mal formé: ${lang}`);
  return { start: match.index, open, close: i - 1, body: source.slice(open + 1, i - 1) };
}

function evaluateCatalog(body, lang) {
  try {
    // Fichier source contrôlé localement; permet de conserver l'ordre et les clés citées/non citées.
    return Function(`"use strict"; return ({${body}});`)();
  } catch (error) {
    throw new Error(`Impossible de lire le catalogue ${lang}: ${error.message}`);
  }
}

function placeholders(text) {
  return [...text.matchAll(/\{[A-Za-z0-9_]+\}/g)].map((m) => m[0]).sort();
}

const PROTECTED_PATTERN = /\{[A-Za-z0-9_]+\}|\bDABO\b|\bLOBA\b|https?:\/\/\S+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/**
 * DeepL ne reçoit JAMAIS les fragments sensibles.
 * On découpe le texte en segments traduisibles et protégés, puis on
 * réassemble les traductions avec les valeurs originales.
 */
function splitProtectedText(text) {
  const parts = [];
  let lastIndex = 0;
  PROTECTED_PATTERN.lastIndex = 0;

  for (const match of text.matchAll(PROTECTED_PATTERN)) {
    if (match.index > lastIndex) {
      parts.push({ type: "translate", value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: "protected", value: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "translate", value: text.slice(lastIndex) });
  }

  return parts;
}

function buildTranslationPlan(texts) {
  const plans = texts.map((text) => splitProtectedText(text));
  const translatable = [];

  for (const parts of plans) {
    for (const part of parts) {
      if (part.type === "translate" && part.value.length > 0) {
        part.translationIndex = translatable.length;
        translatable.push(part.value);
      }
    }
  }

  return { plans, translatable };
}

function rebuildTexts(plans, translations) {
  return plans.map((parts) =>
    parts
      .map((part) =>
        part.type === "protected"
          ? part.value
          : translations[part.translationIndex] ?? ""
      )
      .join("")
  );
}

async function deeplBatch(texts, targetLang, attempt = 1) {
  if (texts.length === 0) return [];

  const body = new URLSearchParams();
  for (const text of texts) body.append("text", text);
  body.set("source_lang", "FR");
  body.set("target_lang", targetLang);
  body.set("preserve_formatting", "1");

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${API_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if ((response.status === 429 || response.status >= 500) && attempt < 5) {
    const delay = 1000 * 2 ** (attempt - 1);
    console.log(`   ↻ DeepL ${response.status}, nouvelle tentative dans ${delay / 1000}s…`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return deeplBatch(texts, targetLang, attempt + 1);
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`DeepL ${response.status}: ${detail.slice(0, 500)}`);
  }
  const payload = await response.json();
  if (!Array.isArray(payload.translations) || payload.translations.length !== texts.length) {
    throw new Error(`Réponse DeepL inattendue pour ${targetLang}`);
  }
  return payload.translations.map((item) => item.text);
}

async function translateCatalog(sourceCatalog, target) {
  const entries = Object.entries(sourceCatalog);
  const output = {};
  console.log(`\n🌐 ${target.label}: ${entries.length} entrées à traduire`);

  for (let start = 0; start < entries.length; start += BATCH_SIZE) {
    const batch = entries.slice(start, start + BATCH_SIZE);
    const plan = buildTranslationPlan(batch.map(([, value]) => value));
    const translatedSegments = await deeplBatch(plan.translatable, target.deepl);
    const translated = rebuildTexts(plan.plans, translatedSegments);

    for (let i = 0; i < batch.length; i += 1) {
      const [key, sourceText] = batch[i];
      const finalText = translated[i];
      const before = placeholders(sourceText);
      const after = placeholders(finalText);
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        throw new Error(`${target.code}.${key}: placeholders modifiés (${before.join(", ")} → ${after.join(", ")})`);
      }
      if (/\bDABO\b/.test(sourceText) && !/\bDABO\b/.test(finalText)) throw new Error(`${target.code}.${key}: DABO a été modifié`);
      if (/\bLOBA\b/.test(sourceText) && !/\bLOBA\b/.test(finalText)) throw new Error(`${target.code}.${key}: LOBA a été modifié`);
      output[key] = finalText;
    }
    console.log(`   ✓ ${Math.min(start + BATCH_SIZE, entries.length)}/${entries.length}`);
  }
  return output;
}

function catalogBlock(lang, catalog) {
  const rows = Object.entries(catalog).map(([key, value]) => {
    const renderedKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
    return `    ${renderedKey}: ${JSON.stringify(value)},`;
  });
  return `  ${lang}: {\n${rows.join("\n")}\n  }`;
}

function replaceExact(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Modification impossible (${label}) : motif introuvable.`);
  return source.replace(before, after);
}

function ensureNoExistingCatalogs(i18n) {
  for (const { code } of TARGETS) {
    if (new RegExp(`\\b${code}:\\s*\\{`).test(i18n)) {
      throw new Error(`Le catalogue ${code} existe déjà. Repars du ZIP PROPRE V2 avant de relancer.`);
    }
  }
}

function updateSourceFiles(catalogs) {
  const staged = new Map();
  let i18n = read("lib/i18n.ts");
  ensureNoExistingCatalogs(i18n);

  // Texte d'aide désormais exact dans les trois langues déjà en production.
  i18n = i18n
    .replace('settings_language_hint: "DABO active une langue seulement lorsque sa traduction est complète. Allemand, espagnol, italien et portugais sont préparés pour la prochaine étape.",', 'settings_language_hint: "Choisissez la langue de DABO. Toutes les langues proposées ici sont complètes et vérifiées.",')
    .replace('settings_language_hint: "DABO activeert een taal pas wanneer de vertaling volledig is. Duits, Spaans, Italiaans en Portugees zijn voorbereid voor de volgende stap.",', 'settings_language_hint: "Kies de taal van DABO. Alle talen die hier worden aangeboden, zijn volledig en gecontroleerd.",')
    .replace('settings_language_hint: "DABO only enables a language once its translation is complete. German, Spanish, Italian and Portuguese are prepared for the next step.",', 'settings_language_hint: "Choose the DABO language. Every language offered here is complete and verified.",');

  i18n = replaceExact(i18n, 'export type Lang = "fr" | "nl" | "en";', 'export type Lang = "fr" | "nl" | "en" | "de" | "es" | "it" | "pt";', "Lang");
  const en = findLanguageBlock(i18n, "en");
  const afterEn = en.close + 1;
  const commaIndex = i18n.slice(afterEn).search(/\S/);
  if (commaIndex < 0 || i18n[afterEn + commaIndex] !== ",") throw new Error("Fin du bloc anglais inattendue.");
  const insertAt = afterEn + commaIndex + 1;
  const extra = TARGETS.map(({ code }) => `\n${catalogBlock(code, catalogs[code])},`).join("");
  i18n = i18n.slice(0, insertAt) + extra + i18n.slice(insertAt);
  staged.set("lib/i18n.ts", i18n);

  let languages = read("lib/languages.ts");
  languages = languages
    .replace('{ code: "de", label: "Allemand", nativeLabel: "Deutsch", available: false }', '{ code: "de", label: "Allemand", nativeLabel: "Deutsch", available: true }')
    .replace('{ code: "es", label: "Espagnol", nativeLabel: "Español", available: false }', '{ code: "es", label: "Espagnol", nativeLabel: "Español", available: true }')
    .replace('{ code: "it", label: "Italien", nativeLabel: "Italiano", available: false }', '{ code: "it", label: "Italien", nativeLabel: "Italiano", available: true }')
    .replace('{ code: "pt", label: "Portugais", nativeLabel: "Português", available: false }', '{ code: "pt", label: "Portugais", nativeLabel: "Português", available: true }')
    .replace('language.available && ["fr", "nl", "en"].includes(language.code)', 'language.available && ["fr", "nl", "en", "de", "es", "it", "pt"].includes(language.code)');
  staged.set("lib/languages.ts", languages);

  let types = read("lib/types.ts");
  types = replaceExact(types, 'language: "fr" | "nl" | "en";', 'language: "fr" | "nl" | "en" | "de" | "es" | "it" | "pt";', "Member.language");
  staged.set("lib/types.ts", types);

  let countries = read("lib/countries.ts");
  countries = replaceExact(countries,
    'const DISPLAY_LOCALE: Record<Lang, string> = { fr: "fr", nl: "nl", en: "en" };',
    'const DISPLAY_LOCALE: Record<Lang, string> = { fr: "fr", nl: "nl", en: "en", de: "de", es: "es", it: "it", pt: "pt-PT" };',
    "country locales");
  staged.set("lib/countries.ts", countries);

  let calendar = read("app/app/calendrier/page.tsx");
  calendar = replaceExact(calendar,
    'const locale = me?.language === "nl" ? "nl-BE" : me?.language === "en" ? "en-GB" : "fr-BE";',
    'const locale = ({ fr: "fr-BE", nl: "nl-BE", en: "en-GB", de: "de-BE", es: "es-ES", it: "it-IT", pt: "pt-PT" } as const)[me?.language || "fr"] || "fr-BE";',
    "calendar locale");
  staged.set("app/app/calendrier/page.tsx", calendar);

  let check = read("scripts/check-i18n.mjs");
  check = replaceExact(check, 'for (const lang of ["fr", "nl", "en"]) {', 'for (const lang of ["fr", "nl", "en", "de", "es", "it", "pt"]) {', "check languages");
  check = check.replace('console.log(`[i18n] OK — ${usedKeys.size} clés statiques vérifiées en FR/NL/EN.`);', 'console.log(`[i18n] OK — ${usedKeys.size} clés statiques vérifiées en FR/NL/EN/DE/ES/IT/PT.`);');
  // Ajout d’un contrôle fort: mêmes clés que le catalogue FR courant dans les 7 catalogues.
  check = check.replace('if (failed) process.exit(1);', `const allLangs = ["fr", "nl", "en", "de", "es", "it", "pt"];
const reference = extractLanguageKeys("fr");
for (const lang of allLangs) {
  const defined = extractLanguageKeys(lang);
  const missingFromCatalog = [...reference].filter((key) => !defined.has(key));
  const extraInCatalog = [...defined].filter((key) => !reference.has(key));
  if (defined.size !== reference.size || missingFromCatalog.length || extraInCatalog.length) {
    failed = true;
    console.error(\`\\n[i18n] \${lang}: catalogue incomplet/incohérent (\${defined.size}/\${reference.size})\`);
    for (const key of missingFromCatalog.slice(0, 20)) console.error(\`  - manquante: \${key}\`);
    for (const key of extraInCatalog.slice(0, 20)) console.error(\`  - en trop: \${key}\`);
  }
}

if (failed) process.exit(1);`);
  staged.set("scripts/check-i18n.mjs", check);

  // Suggestions intelligentes: couverture de base native dans les 4 nouvelles langues.
  let smart = read("lib/smart-suggestions.ts");
  const marker = '  en: {\n    courses: [';
  if (!smart.includes(marker)) throw new Error("Bloc smart suggestions anglais introuvable.");
  const enStart = smart.indexOf(marker);
  const domainEndMarker = '\n  },\n};\n\nconst LEXICON_URLS';
  const domainEnd = smart.indexOf(domainEndMarker, enStart);
  if (domainEnd < 0) throw new Error("Fin DOMAIN_TERMS introuvable.");
  const newDomains = `\n  de: {\n    courses: ["Milch", "Brot", "Eier", "Wasser", "Reis", "Gemüse", "Obst", "Spülmittel", "Waschmittel", "Zahnpasta", "Toilettenpapier", "Seife", "Shampoo", "Kaffee", "Zucker", "Verlängerungskabel"],\n    tasks: ["Küche putzen", "Badezimmer putzen", "Müll rausbringen", "Geschirr spülen", "Staubsaugen", "Wäsche waschen", "Wohnzimmer aufräumen", "Pflanzen gießen", "Haus lüften"],\n  },\n  es: {\n    courses: ["Leche", "Pan", "Huevos", "Agua", "Arroz", "Verduras", "Fruta", "Lavavajillas", "Detergente", "Pasta de dientes", "Papel higiénico", "Jabón", "Champú", "Café", "Azúcar", "Alargador"],\n    tasks: ["Limpiar la cocina", "Limpiar el baño", "Sacar la basura", "Lavar los platos", "Pasar la aspiradora", "Hacer la colada", "Ordenar el salón", "Regar las plantas", "Ventilar la casa"],\n  },\n  it: {\n    courses: ["Latte", "Pane", "Uova", "Acqua", "Riso", "Verdure", "Frutta", "Detersivo per piatti", "Detersivo per bucato", "Dentifricio", "Carta igienica", "Sapone", "Shampoo", "Caffè", "Zucchero", "Prolunga"],\n    tasks: ["Pulire la cucina", "Pulire il bagno", "Portare fuori la spazzatura", "Lavare i piatti", "Passare l’aspirapolvere", "Fare il bucato", "Riordinare il soggiorno", "Annaffiare le piante", "Arieggiare la casa"],\n  },\n  pt: {\n    courses: ["Leite", "Pão", "Ovos", "Água", "Arroz", "Legumes", "Fruta", "Detergente da loiça", "Detergente da roupa", "Pasta de dentes", "Papel higiénico", "Sabão", "Champô", "Café", "Açúcar", "Extensão elétrica"],\n    tasks: ["Limpar a cozinha", "Limpar a casa de banho", "Levar o lixo", "Lavar a loiça", "Aspirar", "Lavar a roupa", "Arrumar a sala", "Regar as plantas", "Arejar a casa"],\n  },`;
  smart = smart.slice(0, domainEnd) + newDomains + smart.slice(domainEnd);
  smart = smart.replace(
    '  en: "https://cdn.jsdelivr.net/npm/an-array-of-english-words@2.0.0/index.json",\n};',
    '  en: "https://cdn.jsdelivr.net/npm/an-array-of-english-words@2.0.0/index.json",\n  de: "https://cdn.jsdelivr.net/npm/an-array-of-german-words@1.2.0/words.json",\n  es: "https://cdn.jsdelivr.net/npm/an-array-of-spanish-words@2.0.0/index.json",\n  it: "https://cdn.jsdelivr.net/npm/an-array-of-italian-words@1.2.0/words.json",\n  pt: "https://cdn.jsdelivr.net/npm/an-array-of-portuguese-words@1.2.0/words.json",\n};'
  );
  staged.set("lib/smart-suggestions.ts", smart);
  // Commit atomique côté script: aucune écriture avant que toutes les transformations
  // aient été calculées sans erreur.
  for (const [path, content] of staged) {
    write(path, content);
  }

}

async function main() {
  let i18n = read("lib/i18n.ts");
  ensureNoExistingCatalogs(i18n);

  // Le nouveau texte d'aide fait partie du catalogue français utilisé comme source DeepL.
  i18n = i18n.replace('settings_language_hint: "DABO active une langue seulement lorsque sa traduction est complète. Allemand, espagnol, italien et portugais sont préparés pour la prochaine étape.",', 'settings_language_hint: "Choisissez la langue de DABO. Toutes les langues proposées ici sont complètes et vérifiées.",');
  const fr = findLanguageBlock(i18n, "fr");
  const sourceCatalog = evaluateCatalog(fr.body, "fr");
  const keys = Object.keys(sourceCatalog);
  if (keys.length === 0) {
    throw new Error("Catalogue français vide. Rien n’a été modifié.");
  }

  // Le catalogue FR courant est la source de vérité : on traduit TOUTES ses entrées,
  // y compris celles ajoutées depuis la préparation initiale du lot.
  const expectedKeys = keys.length;
  console.log(`✅ Source FR actuelle: ${expectedKeys}/${expectedKeys} entrées`);
  console.log("🔐 DABO, LOBA, placeholders {…}, URLs et e-mails ne sont jamais envoyés à DeepL.");

  const catalogs = {};
  for (const target of TARGETS) catalogs[target.code] = await translateCatalog(sourceCatalog, target);

  for (const target of TARGETS) {
    if (Object.keys(catalogs[target.code]).length !== expectedKeys) throw new Error(`${target.code}: catalogue incomplet (${Object.keys(catalogs[target.code]).length}/${expectedKeys})`);
  }

  // Ne modifie les fichiers du projet qu'après succès des 4 traductions.
  updateSourceFiles(catalogs);
  console.log("\n✅ Internationalisation V2.1 générée localement.");
  console.log(`   DE ${expectedKeys}/${expectedKeys} · ES ${expectedKeys}/${expectedKeys} · IT ${expectedKeys}/${expectedKeys} · PT ${expectedKeys}/${expectedKeys}`);
  console.log("➡️ Étape suivante: npm run verify");
}

main().catch((error) => {
  console.error(`\n❌ ${error.message}`);
  process.exit(1);
});
