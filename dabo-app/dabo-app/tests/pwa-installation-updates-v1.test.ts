import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const updater = fs.readFileSync("components/PwaUpdater.tsx", "utf8");
const sw = fs.readFileSync("public/sw.js", "utf8");
const config = fs.readFileSync("next.config.ts", "utf8");
const manifest = JSON.parse(fs.readFileSync("public/manifest.json", "utf8"));
const layout = fs.readFileSync("app/layout.tsx", "utf8");

test("PWA V1 vérifie le service worker sans dépendre du cache HTTP", () => {
  assert.match(updater, /register\("\/sw\.js", \{ updateViaCache: "none" \}\)/);
  assert.match(updater, /registration\?\.update\(\)/);
  assert.match(config, /source: "\/sw\.js"/);
  assert.match(config, /no-cache, no-store, must-revalidate/);
});

test("PWA V1 recherche aussi une mise à jour au retour dans DABO et pendant une longue session", () => {
  assert.match(updater, /visibilitychange/);
  assert.match(updater, /pageshow/);
  assert.match(updater, /focus/);
  assert.match(updater, /setInterval\(checkForUpdate, UPDATE_INTERVAL_MS\)/);
});

test("PWA V1 active immédiatement le nouveau worker puis recharge une seule fois", () => {
  assert.match(sw, /self\.skipWaiting\(\)/);
  assert.match(sw, /self\.clients\.claim\(\)/);
  assert.match(updater, /controllerchange/);
  assert.match(updater, /sessionStorage\.getItem\(RELOAD_GUARD\)/);
  assert.match(updater, /window\.location\.reload\(\)/);
});

test("PWA V1 empêche le manifeste de rester figé dans un ancien cache", () => {
  assert.match(config, /source: "\/manifest\.json"/);
  assert.match(layout, /manifest: "\/manifest\.json\?v=3"/);
});

test("PWA V1 conserve des icônes versionnées et une icône maskable installable", () => {
  const sources = manifest.icons.map((icon: { src: string }) => icon.src);
  assert.ok(sources.some((src: string) => src.includes("dabo-equilibre-v3-192.png")));
  assert.ok(sources.some((src: string) => src.includes("dabo-equilibre-v3-512.png")));
  assert.ok(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === "maskable"));
  assert.equal(manifest.display, "standalone");
});
