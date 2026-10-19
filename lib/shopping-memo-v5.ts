/** Offline, deterministic memo parser. Uncertain entries remain editable; no AI claim. */
export type MemoArticle = { id: string; name: string; quantity: string };
const NUMBER_WORDS: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  one: 1, two: 2, three: 3, four: 4, five: 5,  seven: 7, eight: 8, nine: 9, ten: 10,
  een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9, tien: 10,
  ein: 1, eine: 1, zwei: 2, drei: 3,  fünf: 5, sechs: 6, sieben: 7,  neun: 9, zehn: 10,
  uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10,
  dois: 2, duas: 2, três: 3, quatro: 4,   sete: 7, oito: 8,  dez: 10,
};
const UNITS = ["bouteilles?", "bottles?", "flessen?", "flaschen?", "botellas?", "bottiglie?", "garrafas?", "paquets?", "packs?", "pakjes?", "packungen?", "paquetes?", "pacchetti?", "pacotes?", "bo[iî]tes?", "boxes?", "dozen", "dosen", "cajas?", "scatole?", "caixas?", "sacs?", "bags?", "zakken?", "beutel", "bolsas?", "sacchetti?", "kg", "g", "l", "ml", "litres?", "liters?", "litros?", "litri", "unités?", "units?", "stuks?", "stück", "unidades?", "pezzi?"];
const UNIT_RE = new RegExp(`^(${UNITS.join("|")})\\b\\s*(?:d['’e]?\\s*|de\\s+|of\\s+|van\\s+|di\\s+|da\\s+)?`, "iu");
const PREFIX_RE = /^(?:(?:ach[eè]te|prends?|ajoute|il nous faut|acheter|prendre|buy|add|need|please buy|koop|voeg toe|kaufen|comprar|compra|aggiungi|acquista|adicionar|precisamos de)\s+)+/iu;
const ARTICLE_RE = /^(?:du|de la|de l['’]|des|d['’]|de|the|some|het|een|der|die|das|el|la|los|las|del|dei|degli|della|o|a|os|as)\s+/iu;
const JOIN_RE = /\s+(?:et|and|en|und|y|e)\s+(?=(?:(?:\d+(?:[.,]\d+)?|[\p{L}]+)\s+)?[\p{L}])/giu;
function normalizePart(raw: string): string {
  return raw.trim().replace(/^(?:[-*☐☑]\s*)+/, "").replace(PREFIX_RE, "").replace(ARTICLE_RE, "").trim().replace(/[.!?]+$/, "").trim();
}
export function parseShoppingMemo(input: string): MemoArticle[] {
  const cleaned = input.trim().slice(0, 6000);
  if (!cleaned) return [];
  const segments = cleaned.replace(JOIN_RE, ", ").split(/[\n;,•]+/).map(normalizePart).filter(Boolean).slice(0, 60);
  return segments.map((segment, index) => {
    const match = segment.match(/^(\d+(?:[.,]\d+)?|[\p{L}]+)\s+(.+)$/u);
    const numeric = match ? (NUMBER_WORDS[match[1].toLocaleLowerCase()] ?? (/^\d/.test(match[1]) ? Number(match[1].replace(",", ".")) : null)) : null;
    if (numeric === null || !Number.isFinite(numeric) || numeric <= 0) return { id: `memo-${index}`, name: segment, quantity: "" };
    const rest = match![2].trim();
    const unitMatch = rest.match(UNIT_RE);
    const name = normalizePart(unitMatch ? rest.slice(unitMatch[0].length) : rest);
    if (!name) return { id: `memo-${index}`, name: segment, quantity: "" };
    return { id: `memo-${index}`, name, quantity: unitMatch ? `${numeric} ${unitMatch[1]}` : String(numeric) };
  });
}
export function normalizeMemoName(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}
