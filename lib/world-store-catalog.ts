export const VERIFIED_STORE_SUPPLEMENTS: Record<string, string[]> = {
  CM: ["Carrefour", "Carrefour Market", "Santa Lucia", "Dovv", "Super U"],
  DE: ["Edeka", "Rewe", "Aldi Nord", "Aldi Süd", "Lidl", "Kaufland", "Penny", "Netto Marken-Discount"],
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
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}
