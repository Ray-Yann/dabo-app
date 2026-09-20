import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),"utf8");

test("LOBA Product Radar V1 connaît Finances comme capacité disponible",()=>{
 const source=read("app/api/admin/dashboard/route.ts");
 assert.match(source,/productCapabilities:[\s\S]*id: "finances"[\s\S]*stage: "Disponible"/);
});

test("LOBA Product Radar V1 ne repropose plus Factures & Budget dans le radar",()=>{
 const source=read("app/api/admin/dashboard/route.ts");
 const radar=source.split("productRadar: [")[1]?.split("],")[0]||"";
 assert.doesNotMatch(radar,/Factures & Budget/);
 assert.match(radar,/Documents du foyer/);
});

test("LOBA Product Radar V1 distingue capacités existantes et pistes définies",()=>{
 const source=read("lib/loba-ai.ts");
 assert.match(source,/Capacités produit déjà disponibles/);
 assert.match(source,/Pistes produit définies à explorer/);
 assert.match(source,/ne les recommande jamais comme de nouvelles fonctionnalités/);
});

test("LOBA Product Radar V1 ne prétend plus découvrir les pistes affichées",()=>{
 for(const file of ["app/admin/page.tsx","page.tsx"]){
  const source=read(file);
  assert.match(source,/Pistes produit définies à explorer/);
  assert.doesNotMatch(source,/Ce que LOBA veut explorer pour les foyers/);
 }
});

test("LOBA Product Radar V1 transmet aussi les capacités au moteur conversationnel",()=>{
 const source=read("components/LobaAdminChat.tsx");
 assert.match(source,/productCapabilities/);
 assert.match(source,/productCapabilities,productRadar/);
});
