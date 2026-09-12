export type NearbyStore = {
  id: string;
  name: string;
  distanceMeters: number;
  category: "supermarket" | "convenience" | "greengrocer" | "grocery" | "other";
  address: string | null;
};

type OsmElement = {
  id?: number;
  type?: string;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string | undefined>;
};

export function validCoordinates(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90
    && longitude >= -180 && longitude <= 180;
}

export function roundForNearbyLookup(value: number): number {
  // ~110 m pour la latitude : assez précis pour les magasins de proximité,
  // sans transmettre inutilement les coordonnées GPS exactes au fournisseur POI.
  return Math.round(value * 1000) / 1000;
}

export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (value: number) => value * Math.PI / 180;
  const earthRadius = 6_371_000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function elementPosition(element: OsmElement): { lat: number; lon: number } | null {
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  if (typeof lat !== "number" || typeof lon !== "number" || !validCoordinates(lat, lon)) return null;
  return { lat, lon };
}

function addressFromTags(tags: Record<string, string | undefined>): string | null {
  const street = tags["addr:street"]?.trim();
  const number = tags["addr:housenumber"]?.trim();
  const city = tags["addr:city"]?.trim();
  const first = [street, number].filter(Boolean).join(" ");
  const result = [first, city].filter(Boolean).join(", ");
  return result || null;
}

export function normalizeNearbyStores(
  elements: OsmElement[],
  userLatitude: number,
  userLongitude: number,
  limit = 15,
): NearbyStore[] {
  const stores: NearbyStore[] = [];
  const seen = new Set<string>();

  for (const element of elements) {
    const position = elementPosition(element);
    const tags = element.tags || {};
    const name = (tags.name || tags.brand || tags.operator || "").trim();
    if (!position || !name) continue;

    const id = `${element.type || "osm"}-${element.id || `${position.lat}-${position.lon}`}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const shop = (tags.shop || "").toLowerCase();
    const category: NearbyStore["category"] = shop === "supermarket" || shop === "convenience" || shop === "greengrocer" || shop === "grocery"
      ? shop
      : "other";

    stores.push({
      id,
      name,
      distanceMeters: distanceMeters(userLatitude, userLongitude, position.lat, position.lon),
      category,
      address: addressFromTags(tags),
    });
  }

  return stores
    .sort((a, b) => a.distanceMeters - b.distanceMeters || a.name.localeCompare(b.name))
    .slice(0, limit);
}
