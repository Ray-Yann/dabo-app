import type { Lang } from "@/lib/i18n";

export type SuggestionDomain = "courses" | "tasks";

const DOMAIN_TERMS: Record<Lang, Record<SuggestionDomain, string[]>> = {
  fr: {
    courses: [
      "Lait", "Lessive", "Légumes", "Liquide vaisselle", "Lingettes", "Litière", "Rallonge",
      "Pain", "Œufs", "Eau", "Riz", "Pâtes", "Tomates", "Pommes", "Pommes de terre", "Bananes",
      "Poulet", "Poisson", "Dentifrice", "Papier toilette", "Savon", "Shampoing", "Café", "Sucre",
    ],
    tasks: [
      "Nettoyer la cuisine", "Nettoyer la salle de bain", "Sortir les poubelles", "Faire la vaisselle",
      "Passer l’aspirateur", "Faire la lessive", "Ranger le salon", "Arroser les plantes", "Aérer la maison",
    ],
  },
  nl: {
    courses: [
      "Melk", "Brood", "Eieren", "Water", "Rijst", "Groenten", "Fruit", "Afwasmiddel", "Wasmiddel",
      "Tandpasta", "Toiletpapier", "Zeep", "Shampoo", "Koffie", "Suiker", "Verlengkabel",
    ],
    tasks: [
      "Keuken schoonmaken", "Badkamer schoonmaken", "Vuilnis buitenzetten", "Afwas doen",
      "Stofzuigen", "Was doen", "Woonkamer opruimen", "Planten water geven", "Huis verluchten",
    ],
  },
  en: {
    courses: [
      "Milk", "Bread", "Eggs", "Water", "Rice", "Vegetables", "Fruit", "Dish soap", "Laundry detergent",
      "Toothpaste", "Toilet paper", "Soap", "Shampoo", "Coffee", "Sugar", "Extension cord",
    ],
    tasks: [
      "Clean the kitchen", "Clean the bathroom", "Take out the trash", "Do the dishes", "Vacuum",
      "Do the laundry", "Tidy the living room", "Water the plants", "Air out the house",
    ],
  },
};

const LEXICON_URLS: Record<Lang, string> = {
  fr: "https://cdn.jsdelivr.net/npm/an-array-of-french-words@2.0.0/index.json",
  nl: "https://cdn.jsdelivr.net/npm/an-array-of-dutch-words/index.json",
  en: "https://cdn.jsdelivr.net/npm/an-array-of-english-words@2.0.0/index.json",
};

const lexiconCache = new Map<Lang, string[]>();
const lexiconPromises = new Map<Lang, Promise<string[]>>();

export function normalizeSuggestion(value: string) {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

function titleSuggestion(value: string) {
  if (!value) return value;
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

export function getSmartSuggestions(
  input: string,
  learnedTerms: string[],
  options: {
    lang?: Lang;
    domain?: SuggestionDomain;
    lexicon?: string[];
    limit?: number;
  } = {},
) {
  const query = normalizeSuggestion(input);
  if (!query) return [];

  const lang = options.lang ?? "fr";
  const domain = options.domain ?? "courses";
  const limit = options.limit ?? 6;
  const lexicon = options.lexicon ?? [];
  const seen = new Set<string>();
  const results: string[] = [];

  const addMatches = (values: string[], format = false) => {
    for (const raw of values) {
      const value = raw.trim();
      if (!value) continue;
      const key = normalizeSuggestion(value);
      if (!key || key === query || seen.has(key) || !key.startsWith(query)) continue;
      seen.add(key);
      results.push(format ? titleSuggestion(value) : value);
      if (results.length >= limit) return true;
    }
    return false;
  };

  // 1. Le vocabulaire réellement utilisé dans ce module du foyer reste prioritaire.
  if (addMatches(learnedTerms)) return results;
  // 2. Quelques termes très utiles à DABO remontent avant le dictionnaire général.
  if (addMatches(DOMAIN_TERMS[lang][domain])) return results;

  // 3. Dictionnaire général de la langue active. On privilégie les complétions courtes,
  // ce qui donne des propositions naturelles plutôt qu'une longue liste alphabétique obscure.
  const matches = lexicon
    .filter((value) => normalizeSuggestion(value).startsWith(query) && normalizeSuggestion(value) !== query)
    .sort((a, b) => a.length - b.length || a.localeCompare(b, lang));
  addMatches(matches, true);

  return results.slice(0, limit);
}

export async function loadLanguageLexicon(lang: Lang): Promise<string[]> {
  const cached = lexiconCache.get(lang);
  if (cached) return cached;

  const pending = lexiconPromises.get(lang);
  if (pending) return pending;

  const request = fetch(LEXICON_URLS[lang], { cache: "force-cache" })
    .then(async (response) => {
      if (!response.ok) throw new Error(`lexicon ${lang}: ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error(`lexicon ${lang}: invalid payload`);
      const words = data.filter((word): word is string => typeof word === "string" && word.length > 1);
      lexiconCache.set(lang, words);
      return words;
    })
    .catch(() => [] as string[])
    .finally(() => lexiconPromises.delete(lang));

  lexiconPromises.set(lang, request);
  return request;
}
