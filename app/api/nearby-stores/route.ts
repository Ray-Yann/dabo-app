import { NextRequest, NextResponse } from "next/server";
import { verifyUserToken } from "@/lib/supabase-admin";
import { normalizeNearbyStores, roundForNearbyLookup, validCoordinates, type NearbyStore } from "@/lib/nearby-stores";

export const dynamic = "force-dynamic";

const RADIUS_METERS = 5_000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const REQUEST_COOLDOWN_MS = 3_000;
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

type CacheEntry = { expiresAt: number; stores: NearbyStore[] };
const nearbyCache = new Map<string, CacheEntry>();
const lastRequestByUser = new Map<string, number>();

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

async function queryOverpass(latitude: number, longitude: number): Promise<unknown[]> {
  // La position envoyée au fournisseur est volontairement arrondie (~100 m).
  const queryLatitude = roundForNearbyLookup(latitude);
  const queryLongitude = roundForNearbyLookup(longitude);
  const query = `[out:json][timeout:5];(
    nwr(around:${RADIUS_METERS},${queryLatitude},${queryLongitude})["shop"~"^(supermarket|convenience|greengrocer|grocery)$"];
  );out center tags;`;

  let lastError: unknown = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "Accept": "application/json",
          "User-Agent": "DABO-nearby-stores/1.0",
        },
        body: new URLSearchParams({ data: query }).toString(),
        signal: AbortSignal.timeout(4_500),
        cache: "no-store",
      });
      if (!response.ok) {
        lastError = new Error(`Overpass ${response.status}`);
        continue;
      }
      const payload = await response.json() as { elements?: unknown[] };
      return Array.isArray(payload.elements) ? payload.elements : [];
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Nearby store provider unavailable");
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const user = await verifyUserToken(token);
  if (!user) return noStoreJson({ error: "unauthorized" }, { status: 401 });

  const now = Date.now();
  const previous = lastRequestByUser.get(user.id) || 0;
  if (now - previous < REQUEST_COOLDOWN_MS) {
    return noStoreJson({ error: "too_many_requests" }, { status: 429 });
  }
  lastRequestByUser.set(user.id, now);

  let body: { latitude?: unknown; longitude?: unknown } = {};
  try { body = await request.json(); } catch { /* réponse 400 ci-dessous */ }
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  if (!validCoordinates(latitude, longitude)) {
    return noStoreJson({ error: "invalid_coordinates" }, { status: 400 });
  }

  // Cache spatial volontairement grossier (~1 km) : il contient seulement des POI publics,
  // jamais l'identité ni la position exacte de l'utilisateur.
  const cacheKey = `${Math.round(latitude * 100) / 100}:${Math.round(longitude * 100) / 100}`;
  const cached = nearbyCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return noStoreJson({ stores: cached.stores, radiusMeters: RADIUS_METERS, source: "openstreetmap", cached: true });
  }

  try {
    const elements = await queryOverpass(latitude, longitude);
    const stores = normalizeNearbyStores(elements as Parameters<typeof normalizeNearbyStores>[0], latitude, longitude);
    nearbyCache.set(cacheKey, { stores, expiresAt: now + CACHE_TTL_MS });
    return noStoreJson({ stores, radiusMeters: RADIUS_METERS, source: "openstreetmap", cached: false });
  } catch (error) {
    console.error("[nearby-stores] provider unavailable", error instanceof Error ? { name: error.name, message: error.message } : { unavailable: true });
    return noStoreJson({ error: "provider_unavailable" }, { status: 503 });
  }
}
