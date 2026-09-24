import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const manifest = JSON.parse(fs.readFileSync("public/manifest.json", "utf8"));

test("PWA Shortcuts V1 expose quatre raccourcis utiles", () => {
  assert.ok(Array.isArray(manifest.shortcuts));
  assert.equal(manifest.shortcuts.length, 4);
});

test("PWA Shortcuts V1 garde Aujourd hui comme acces principal", () => {
  assert.ok(
    manifest.shortcuts.some((shortcut: { url: string; name: string }) =>
      shortcut.url === "/app" &&
      shortcut.name === "Aujourd'hui"
    )
  );
});

test("PWA Shortcuts V1 reutilise les parcours canoniques de creation", () => {
  const urls = manifest.shortcuts.map((shortcut: { url: string }) => shortcut.url);

  assert.ok(urls.includes("/app/taches?first=1"));
  assert.ok(urls.includes("/app/courses?first=1"));
  assert.ok(urls.includes("/app/calendrier?first=1"));
});

test("PWA Shortcuts V1 fournit un nom court pour chaque raccourci", () => {
  for (const shortcut of manifest.shortcuts) {
    assert.equal(typeof shortcut.short_name, "string");
    assert.ok(shortcut.short_name.trim().length > 0);
  }
});
