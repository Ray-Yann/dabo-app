import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { distanceMeters, normalizeNearbyStores, roundForNearbyLookup, validCoordinates } from "../lib/nearby-stores";

const read = (path: string) => fs.readFileSync(path, "utf8");

test("Courses V3 demande la position uniquement sur action et sans suivi continu", () => {
  const panel = read("components/NearbyStoresPanel.tsx");
  assert.match(panel, /onClick=\{\(\) => void searchNearby\(\)\}/);
  assert.match(panel, /navigator\.geolocation\.getCurrentPosition/);
  assert.doesNotMatch(panel, /watchPosition/);
  assert.match(panel, /enableHighAccuracy: false/);
});

test("Courses V3 protège la route proximité par authentification et bornes géographiques", () => {
  const route = read("app/api/nearby-stores/route.ts");
  assert.match(route, /verifyUserToken\(token\)/);
  assert.match(route, /validCoordinates\(latitude, longitude\)/);
  assert.match(route, /status: 401/);
  assert.match(route, /status: 400/);
  assert.equal(validCoordinates(50.85, 4.35), true);
  assert.equal(validCoordinates(120, 4.35), false);
});

test("Courses V3 n'envoie au fournisseur qu'une position arrondie et ne stocke pas les coordonnées", () => {
  const route = read("app/api/nearby-stores/route.ts");
  assert.match(route, /roundForNearbyLookup\(latitude\)/);
  assert.match(route, /roundForNearbyLookup\(longitude\)/);
  assert.doesNotMatch(route, /\.from\(/);
  assert.doesNotMatch(route, /latitude.*console|longitude.*console/);
  assert.equal(roundForNearbyLookup(50.846741), 50.847);
});

test("Courses V3 calcule et trie les magasins par vraie distance sans exposer leurs coordonnées au client", () => {
  const stores = normalizeNearbyStores([
    { id: 2, type: "node", lat: 50.86, lon: 4.35, tags: { shop: "supermarket", name: "Loin" } },
    { id: 1, type: "node", lat: 50.851, lon: 4.35, tags: { shop: "supermarket", name: "Proche", "addr:street": "Rue Test", "addr:housenumber": "1" } },
  ], 50.85, 4.35);
  assert.equal(stores[0].name, "Proche");
  assert.equal(stores[0].address, "Rue Test 1");
  assert.ok(distanceMeters(50.85, 4.35, 50.851, 4.35) > 0);
  assert.equal("lat" in stores[0], false);
  assert.equal("lon" in stores[0], false);
});

test("Courses V3 garde un échec de géolocalisation non bloquant et attribue OpenStreetMap", () => {
  const panel = read("components/NearbyStoresPanel.tsx");
  assert.match(panel, /courses_nearby_denied/);
  assert.match(panel, /courses_nearby_unavailable/);
  assert.match(panel, /courses_nearby_error/);
  assert.match(panel, /© OpenStreetMap contributors/);
  assert.match(panel, /openstreetmap\.org\/copyright/);
});

test("Courses V3 transforme un magasin proche en magasin personnel du foyer et ouvre l'ajout", () => {
  const page = read("app/app/courses/page.tsx");
  assert.match(page, /NearbyStoresPanel/);
  assert.match(page, /onUseStore=\{useNearbyStore\}/);
  assert.match(page, /await rememberStore\(cleanName\)/);
  assert.match(page, /setShowAdd\(true\)/);
  assert.match(page, /setAddForm\(\(current\) => \(\{ \.\.\.current, store: cleanName/);
  assert.doesNotMatch(page, /global_stores"\)\.insert/);
});

test("Courses V3 limite explicitement la géolocalisation à DABO lui-même", () => {
  const config = read("next.config.ts");
  assert.match(config, /Permissions-Policy/);
  assert.match(config, /geolocation=\(self\)/);
});
