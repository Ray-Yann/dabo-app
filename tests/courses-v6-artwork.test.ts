import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";

const page = readFileSync("app/app/courses/page.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");

test("Courses V7.1 keeps its photographic identity and product fallbacks", () => {
  assert.match(page, /dabo-courses-hero-photo/);
  assert.doesNotMatch(page, /courseArtwork\(item.name\)/);

  const requiredPhotos = [
    "photographic-groceries.webp",
    "photo-dairy.webp",
    "photo-home.webp",
    "photo-other.webp",
    "photo-pantry.webp",
    "photo-produce.webp",
    "photo-protein.webp",
    "item-banana.webp",
    "item-egg.webp",
    "item-milk.webp",
    "item-tomato.webp",
  ];

  for (const filename of requiredPhotos) {
    assert.ok(
      existsSync(`public/courses-art/${filename}`),
      `Missing photographic asset: ${filename}`
    );
  }

  assert.match(css, /dabo-courses-v7/);
});
