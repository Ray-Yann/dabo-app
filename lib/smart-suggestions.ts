export const STARTER_TERMS = [
  "Lait", "Lessive", "Légumes", "Liquide vaisselle", "Lingettes", "Litière",
  "Pain", "Œufs", "Eau", "Riz", "Pâtes", "Tomates", "Pommes", "Bananes", "Poulet", "Poisson",
  "Nettoyer la cuisine", "Nettoyer la salle de bain", "Sortir les poubelles", "Faire la vaisselle",
  "Passer l’aspirateur", "Faire la lessive", "Ranger le salon", "Arroser les plantes",
  "Melk", "Brood", "Eieren", "Water", "Rijst", "Groenten", "Fruit", "Afwasmiddel",
  "Milk", "Bread", "Eggs", "Water", "Rice", "Vegetables", "Fruit", "Dish soap",
];

export function normalizeSuggestion(value: string) {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

export function getSmartSuggestions(input: string, learnedTerms: string[], limit = 6) {
  const query = normalizeSuggestion(input);
  if (!query) return [];
  const seen = new Set<string>();
  const candidates = [...learnedTerms, ...STARTER_TERMS]
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => {
      const key = normalizeSuggestion(value);
      if (!key || seen.has(key) || key === query) return false;
      seen.add(key);
      return key.startsWith(query);
    });
  return candidates.slice(0, limit);
}
