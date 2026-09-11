export const VERIFIED_STORE_SUPPLEMENTS: Record<string, string[]> = {
  BE: ["Colruyt", "Delhaize", "Carrefour", "Lidl", "Aldi", "Albert Heijn", "Intermarché", "Jumbo"],
  FR: ["E.Leclerc", "Carrefour", "Intermarché", "Lidl", "Aldi", "Auchan", "Super U", "Monoprix"],
  NL: ["Albert Heijn", "Jumbo", "PLUS", "Lidl", "Aldi", "Dirk", "DekaMarkt", "Hoogvliet"],
  GB: ["Tesco", "Sainsbury's", "Asda", "Morrisons", "Aldi", "Lidl", "Waitrose", "Iceland"],
  DE: ["Edeka", "Rewe", "Aldi Nord", "Aldi Süd", "Lidl", "Kaufland", "Penny", "Netto Marken-Discount"],
  ES: ["Mercadona", "Carrefour", "Lidl", "Aldi", "Dia", "Alcampo", "Eroski", "Consum"],
  IT: ["Conad", "Coop", "Esselunga", "Lidl", "Aldi", "Eurospin", "MD", "Carrefour"],
  PT: ["Continente", "Pingo Doce", "Lidl", "Aldi", "Intermarché", "Auchan", "Minipreço", "Mercadona"],
  CM: ["Carrefour", "Carrefour Market", "Santa Lucia", "Dovv", "Super U"],
  CA: ["Loblaws", "Sobeys", "Metro", "Costco", "Walmart", "No Frills", "FreshCo", "Food Basics", "Real Canadian Superstore", "Maxi", "Save-On-Foods"],
  JP: ["AEON", "MaxValu", "Seiyu", "Life", "Ito-Yokado", "Daiei", "Lopia", "TRIAL"],
};

export function mergeStoreNames(...groups: string[][]): string[] {
  const byKey = new Map<string, string>();
  for (const group of groups) {
    for (const value of group) {
      const clean = value.trim();
      if (clean) byKey.set(clean.toLocaleLowerCase(), clean);
    }
  }
  return [...byKey.values()];
}
