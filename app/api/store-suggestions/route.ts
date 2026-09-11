import { NextRequest, NextResponse } from "next/server";
import { VERIFIED_STORE_SUPPLEMENTS, mergeStoreNames } from "@/lib/world-store-catalog";

const NSI_SUPERMARKETS = "https://raw.githubusercontent.com/osmlab/name-suggestion-index/main/data/brands/shop/supermarket.json";

type NsiItem = {
  displayName?: string;
  locationSet?: { include?: string[]; exclude?: string[] };
  tags?: { name?: string; brand?: string };
};

type NsiPayload = { items?: NsiItem[] };

function appliesToCountry(item: NsiItem, country: string): boolean {
  const include = item.locationSet?.include || [];
  const exclude = item.locationSet?.exclude || [];
  const cc = country.toLowerCase();
  if (exclude.includes(cc)) return false;
  // Ne jamais traiter une marque mondiale (001) comme présente dans chaque pays.
  // Seules les enseignes explicitement rattachées au pays sont proposées.
  return include.includes(cc);
}

export async function GET(request: NextRequest) {
  const country = (request.nextUrl.searchParams.get("country") || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return NextResponse.json({ stores: [] }, { status: 400 });

  let nsiStores: string[] = [];
  try {
    const response = await fetch(NSI_SUPERMARKETS, { next: { revalidate: 86400 } });
    if (response.ok) {
      const payload = (await response.json()) as NsiPayload;
      nsiStores = (payload.items || [])
        .filter((item) => appliesToCountry(item, country))
        .map((item) => item.tags?.name || item.tags?.brand || item.displayName || "")
        .filter(Boolean);
    }
  } catch (error) {
    console.error("[store-suggestions] NSI unavailable", error);
  }

  const stores = mergeStoreNames(VERIFIED_STORE_SUPPLEMENTS[country] || [], nsiStores).slice(0, 80);
  return NextResponse.json({ stores }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
}
