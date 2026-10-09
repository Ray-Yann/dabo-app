import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const css=readFileSync("app/globals.css","utf8");
const nav=readFileSync("components/DaboMainNav.tsx","utf8");
const home=readFileSync("app/app/page.tsx","utf8");
test("Brand Language V2 installe la palette premium sémantique",()=>{assert.match(css,/--dabo-canvas/);assert.match(css,/--dabo-forest/);assert.match(css,/--dabo-sage/);assert.match(css,/--dabo-garnet/);});
test("Brand Language V2 donne au plus central la signature principale",()=>{assert.match(nav,/dabo-main-nav-add-circle/);assert.match(css,/\.dabo-main-nav-add-circle/);});
test("Brand Language V2 signe Aujourd'hui par une hiérarchie éditoriale",()=>{assert.match(home,/dabo-v3-section-heading/);assert.match(home,/dabo-v3-hero/);assert.match(css,/\.dabo-today-v2-title/);});
