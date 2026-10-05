import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const css = fs.readFileSync("app/globals.css", "utf8");

test("Planning V2.2.2 sépare structurellement libellé, marqueur et axe sur desktop", () => {
  assert.ok(css.includes("DABO Planning V2.2.2"));
  assert.ok(css.includes(".dabo-timeline:before{left:84px}"));
  assert.ok(css.includes("grid-template-columns:64px minmax(0,1fr);column-gap:34px"));
  assert.ok(css.includes(".dabo-timeline-card:before{left:-21px}"));
});

test("Planning V2.2.2 conserve une zone de respiration dédiée sur mobile", () => {
  assert.ok(css.includes(".dabo-timeline:before{left:68px}"));
  assert.ok(css.includes("grid-template-columns:52px minmax(0,1fr);column-gap:36px"));
  assert.ok(css.includes(".dabo-timeline-card:before{left:-27px}"));
});

test("Planning V2.2.2 protège les libellés temporels contre les césures artificielles", () => {
  assert.ok(css.includes("overflow-wrap:normal;word-break:normal"));
});
