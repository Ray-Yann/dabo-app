/** Offline-first visual recognition. Never assign an unverified branded package. */
export function normalizeCourseVisualName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/[’']/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

const STORES: ReadonlyArray<{ name: string; tokens: readonly string[] }> = [
  { name: 'Action', tokens: ['action'] },
  { name: 'Carrefour', tokens: ['carrefour', 'carrefour market', 'carrefour express'] },
  { name: 'Delhaize', tokens: ['delhaize', 'proxy delhaize', 'ad delhaize'] },
  { name: 'Lidl', tokens: ['lidl'] },
  { name: 'Aldi', tokens: ['aldi'] },
  { name: 'Colruyt', tokens: ['colruyt', 'colruyt lowest prices'] },
  { name: 'Albert Heijn', tokens: ['albert heijn'] },
  { name: 'Intermarché', tokens: ['intermarche'] },
  { name: 'Okay', tokens: ['okay'] },
  { name: 'Kruidvat', tokens: ['kruidvat'] },
];

export function recognizeCourseStore(name: string): string | null {
  const normalized = normalizeCourseVisualName(name);
  return STORES.find((store) => store.tokens.some((token) => normalized === token || normalized.startsWith(`${token} `)))?.name ?? null;
}

/** Curated, locally bundled product illustrations from the approved DABO visual mockup.
 * These are not licensed product photographs or branded packshots.
 * The product must match the whole normalized name after quantity removal.
 */
const CATALOG_VISUALS: ReadonlyArray<{ path: string; names: readonly string[] }> = [
  { path: '/courses-art/catalog-cherry-tomato.webp', names: ["tomates cerises", "tomate cerise", "cherry tomatoes", "cherry tomato", "kerstomaten", "kerstomaat", "cherrytomaten", "pomodorini", "tomates cherry"] },
  { path: '/courses-art/catalog-tomato-sauce.webp', names: ["sauce tomate", "sauce tomates", "tomato sauce", "tomatensaus", "tomatensauce", "salsa de tomate", "salsa di pomodoro", "molho de tomate"] },
  { path: '/courses-art/catalog-canned-tomato.webp', names: ["tomates concassees", "tomate concassee", "canned tomatoes", "chopped tomatoes", "tomatenblokjes", "tomaten in blik", "tomates triturados", "pomodori pelati"] },
  { path: '/courses-art/catalog-almond-milk.webp', names: ["lait d amande", "boisson amande", "almond milk", "almond drink", "amandelmelk", "mandelmilch", "leche de almendras", "latte di mandorla", "leite de amendoa"] },
  { path: '/courses-art/catalog-oat-milk.webp', names: ["lait d avoine", "boisson avoine", "oat milk", "oat drink", "havermelk", "hafermilch", "leche de avena", "latte d avena", "leite de aveia"] },
  { path: '/courses-art/catalog-soy-milk.webp', names: ["lait de soja", "lait soja", "boisson soja", "soy milk", "soya milk", "sojamelk", "sojamilch", "leche de soja", "latte di soia", "leite de soja"] },
  { path: '/courses-art/catalog-lactose-free-milk.webp', names: ["lait sans lactose", "lactose free milk", "lactosevrije melk", "laktosefreie milch", "leche sin lactosa", "latte senza lattosio", "leite sem lactose"] },
  { path: '/courses-art/catalog-milk.webp', names: ["lait", "milk", "melk", "milch", "leche", "latte", "leite"] },
  { path: '/courses-art/catalog-egg.webp', names: ["oeuf", "oeufs", "egg", "eggs", "ei", "eieren", "eier", "huevo", "huevos", "uovo", "uova", "ovo", "ovos"] },
  { path: '/courses-art/catalog-tomato.webp', names: ["tomate", "tomates", "tomato", "tomatoes", "tomaat", "tomaten", "pomodoro", "pomodori"] },
  { path: '/courses-art/catalog-banana.webp', names: ["banane", "bananes", "banana", "bananas", "banaan", "bananen", "platano", "platanos"] },
  { path: '/courses-art/catalog-carrot.webp', names: ["carotte", "carottes", "carrot", "carrots", "wortel", "wortelen", "karotte", "zanahoria", "zanahorias", "carota", "cenoura"] },
  { path: '/courses-art/catalog-onion.webp', names: ["oignon", "oignons", "onion", "onions", "ui", "uien", "zwiebel", "cebolla", "cipolla", "cebola"] },
  { path: '/courses-art/catalog-potato.webp', names: ["pomme de terre", "pommes de terre", "potato", "potatoes", "aardappel", "aardappelen", "kartoffel", "patata", "patatas"] },
  { path: '/courses-art/catalog-pasta.webp', names: ["pates", "pate alimentaire", "pasta", "spaghetti", "macaroni", "nudeln", "fideos", "massa"] },
  { path: '/courses-art/catalog-rice.webp', names: ["riz", "rice", "riz blanc", "riz basmati", "riz jasmin", "rijst", "reis", "arroz", "riso"] },
  { path: '/courses-art/catalog-white-beans.webp', names: ["haricots blancs", "haricot blanc", "white beans", "witte bonen", "weisse bohnen", "alubias blancas", "fagioli bianchi", "feijao branco"] },
  { path: '/courses-art/catalog-lentils.webp', names: ["lentilles", "lentille", "lentils", "linzen", "linsen", "lentejas", "lenticchie", "lentilhas"] },
  { path: '/courses-art/catalog-chicken.webp', names: ["poulet", "chicken", "kip", "huhn", "pollo", "frango"] },
  { path: '/courses-art/catalog-minced-beef.webp', names: ["boeuf hache", "viande hachee", "ground beef", "minced beef", "gehakt", "rinderhack", "carne picada", "carne macinata"] },
  { path: '/courses-art/catalog-salmon.webp', names: ["saumon", "salmon", "zalm", "lachs", "salmon", "salmone", "salmao"] },
  { path: '/courses-art/catalog-tuna.webp', names: ["thon", "tuna", "tonijn", "thunfisch", "atun", "tonno", "atum"] },
  { path: '/courses-art/catalog-toothpaste.webp', names: ["dentifrice", "toothpaste", "tandpasta", "zahnpasta", "pasta de dientes", "dentifricio", "pasta de dentes"] },
  { path: '/courses-art/catalog-toilet-paper.webp', names: ["papier toilette", "toilet paper", "toiletpapier", "toilettenpapier", "papel higienico", "carta igienica"] },
  { path: '/courses-art/catalog-shower-gel.webp', names: ["gel douche", "gel de douche", "shower gel", "douchegel", "duschgel", "gel de bano", "bagnoschiuma"] },
  { path: '/courses-art/catalog-shampoo.webp', names: ["shampoing", "shampoo", "shampooing", "shampoo", "shampu", "champu"] },
  { path: '/courses-art/catalog-soap.webp', names: ["savon", "soap", "zeep", "seife", "jabon", "sapone", "sabao"] },
  { path: '/courses-art/catalog-sanitary-pads.webp', names: ["serviette hygienique", "serviettes hygieniques", "serviette periodique", "serviettes periodiques", "sanitary pad", "sanitary pads", "maandverband", "damenbinde", "compresa", "compresas", "assorbenti", "penso higienico"] },
  { path: '/courses-art/catalog-dish-soap.webp', names: ["liquide vaisselle", "produit vaisselle", "liquide pour vaisselle", "dish soap", "washing up liquid", "afwasmiddel", "spulmittel", "lavavajillas", "detersivo piatti", "detergente louca"] },
  { path: '/courses-art/catalog-laundry-detergent.webp', names: ["lessive", "laundry detergent", "wasmiddel", "waschmittel", "detergente ropa", "detersivo bucato", "detergente roupa"] },
  { path: '/courses-art/catalog-surface-cleaner.webp', names: ["nettoyant multi surfaces", "nettoyant multisurfaces", "surface cleaner", "allesreiniger", "allzweckreiniger", "limpiador multiusos", "detergente multiuso"] },
  { path: '/courses-art/catalog-microfiber.webp', names: ["microfibre", "microfibres", "chiffon microfibre", "chiffons microfibres", "microfiber", "microfibers", "microvezel", "microvezels", "mikrofaser", "microfibra"] },
  { path: '/courses-art/catalog-trash-bags.webp', names: ["sac poubelle", "sacs poubelle", "trash bags", "garbage bags", "vuilniszakken", "mullbeutel", "bolsas de basura", "sacchi spazzatura", "sacos lixo"] },
];

/** Remove only recognizable quantity syntax, never meaningful product descriptors. */
function stripCourseQuantity(name: string): string {
  const unit = '(?:kg|g|gr|grammes?|grams?|l|litres?|liters?|ml|cl|pcs|pieces?|stuks?|stuck|unites?|units?|pack|paquets?|bouteilles?|bottles?)';
  let value = name;
  // A leading count ("6 oeufs") or package quantity ("2 x 500 g riz").
  value = value.replace(new RegExp(`^\\d+\\s*x\\s*\\d+(?:\\s*${unit})?\\s+(?:de |d )?`), '');
  value = value.replace(new RegExp(`^\\d+(?:\\s*${unit})?\\s+(?:de |d )?`), '');
  // Trailing weights, volumes and counts ("riz 1 kg", "oeufs x 6").
  value = value.replace(new RegExp(`\\s+(?:x\\s*)?\\d+\\s*${unit}$`), '');
  value = value.replace(/\s+x\s+\d+$/, '');
  return value.trim();
}

// Only modifiers that preserve the appearance of the generic pictured item.
// A qualifier such as "epicee", "chocolat" or "surgeles" is intentionally not removed.
const SAFE_MODIFIERS: ReadonlyArray<{ base: string; qualifiers: readonly string[] }> = [
  { base: 'oeuf', qualifiers: ['bio', 'frais', 'plein air'] },
  { base: 'oeufs', qualifiers: ['bio', 'frais', 'plein air'] },
  { base: 'egg', qualifiers: ['organic', 'fresh', 'free range'] },
  { base: 'eggs', qualifiers: ['organic', 'fresh', 'free range'] },
  { base: 'eieren', qualifiers: ['bio', 'vrije uitloop'] },
  { base: 'huevos', qualifiers: ['ecologicos', 'frescos'] },
  { base: 'uova', qualifiers: ['biologiche', 'fresche'] },
  { base: 'ovos', qualifiers: ['biologicos', 'frescos'] },
  { base: 'lait', qualifiers: ['demi ecreme', 'entier', 'ecreme'] },
  { base: 'milk', qualifiers: ['semi skimmed', 'whole', 'skimmed'] },
  { base: 'melk', qualifiers: ['halfvolle', 'volle', 'magere'] },
  { base: 'milch', qualifiers: ['voll', 'fettarm'] },
  { base: 'leche', qualifiers: ['entera', 'semidesnatada', 'desnatada'] },
  { base: 'latte', qualifiers: ['intero', 'parzialmente scremato'] },
  { base: 'leite', qualifiers: ['integral', 'meio gordo', 'magro'] },
  { base: 'saumon', qualifiers: ['filet de', 'filets de'] },
  { base: 'salmon', qualifiers: ['fillet of', 'fillets of'] },
  { base: 'zalm', qualifiers: ['filet van'] },
];

/** V3: unbranded, original editorial illustrations for products without an approved photo.
 * Kept separate from photographic catalog so the existing 33 photos remain unchanged.
 */
const V3_EDITORIAL_VISUALS: ReadonlyArray<{ path: string; names: readonly string[] }> = [
  { path: '/courses-art/v3-cotton-buds.svg', names: ['coton tige', 'cotons tiges', 'coton tiges', 'cotton bud', 'cotton buds', 'cotton swab', 'cotton swabs', 'wattenstaafje', 'wattenstaafjes', 'wattestabchen', 'wattestabchen', 'bastoncillo de algodon', 'bastoncillos de algodon', 'cotton fioc', 'bastoncini cotonati', 'cotonete', 'cotonetes'] },
  { path: '/courses-art/v3-scissors.svg', names: ['ciseaux', 'ciseau', 'scissors', 'schaar', 'schaaren', 'schere', 'scheren', 'tijeras', 'forbici', 'tesoura', 'tesouras'] },
  { path: '/courses-art/v3-air-freshener.svg', names: ['desodorisant', 'desodorisant interieur', 'desodorisant maison', 'parfum d ambiance', 'air freshener', 'room freshener', 'luchtverfrisser', 'raumduft', 'ambientador', 'profumatore ambiente', 'ambientador de casa'] },
];
const NORMALIZED_V3_VISUALS = V3_EDITORIAL_VISUALS.map(visual => ({
  path: visual.path,
  names: new Set(visual.names.map(normalizeCourseVisualName)),
}));

const NORMALIZED_VISUALS = CATALOG_VISUALS.map(visual => ({
  path: visual.path,
  names: new Set(visual.names.map(normalizeCourseVisualName)),
}));

const RESERVED_BRANDS = /\b(coca|pepsi|danone|alpro|nestle|nutella|actimel)\b/;

export function courseProductPhoto(name: string): string | null {
  const normalized = stripCourseQuantity(normalizeCourseVisualName(name));
  if (!normalized || RESERVED_BRANDS.test(normalized)) return null;
  const exact = NORMALIZED_VISUALS.find(visual => visual.names.has(normalized));
  if (exact) return exact.path;
  const editorial = NORMALIZED_V3_VISUALS.find(visual => visual.names.has(normalized));
  if (editorial) return editorial.path;

  for (const { base, qualifiers } of SAFE_MODIFIERS) {
    for (const qualifier of qualifiers) {
      const candidates = [
        `${base} ${qualifier}`,
        `${qualifier} ${base}`,
      ];
      if (!candidates.includes(normalized)) continue;
      const visual = NORMALIZED_VISUALS.find(item => item.names.has(base));
      if (visual) return visual.path;
    }
  }
  return null;
}

export type CourseProductSymbol = 'scissors' | 'hygiene' | 'cloth' | 'rice' | 'cleaning' | 'cotton' | 'milk' | 'produce' | 'protein' | 'pantry' | 'generic';
export function courseProductSymbol(name: string): CourseProductSymbol {
  const n = normalizeCourseVisualName(name);
  if (/\b(ciseau|ciseaux|scissors|schaar|schere|tijeras|forbici|tesoura)\b/.test(n)) return 'scissors';
  if (/\b(serviette hygienique|serviettes hygieniques|sanitary pad|sanitary pads|maandverband|binde|compresa|assorbent|penso higienico|tampon|tampons)\b/.test(n)) return 'hygiene';
  if (/\b(microfibre|microfiber|microvezel|microfas|microfibra|chiffon|doek|towel|torchon)\b/.test(n)) return 'cloth';
  if (/\b(riz|rice|rijst|reis|arroz|riso|flocon de riz|flocons de riz)\b/.test(n)) return 'rice';
  if (/\b(liquide vaisselle|afwasmiddel|dishwashing|spulmittel|detergente|lessive|savon|soap|zeep|seife|shampoo|shampoing)\b/.test(n)) return 'cleaning';
  if (/\b(coton|cotons|cotton|wattestaaf|cotton bud|coton tige|cotons tiges|watjes)\b/.test(n)) return 'cotton';
  if (/\b(lait|milk|melk|milch|leche|latte|leite)\b/.test(n)) return 'milk';
  if (/\b(pomme|apple|appel|apfel|manzana|mela|fruit|legume|vegetable)\b/.test(n)) return 'produce';
  if (/\b(viande|meat|vlees|fleisch|carne|poisson|fish|vis|fisch|peixe)\b/.test(n)) return 'protein';
  if (/\b(pate|pasta|farine|flour|meel|harina|pain|bread|brood|brot)\b/.test(n)) return 'pantry';
  return 'generic';
}
