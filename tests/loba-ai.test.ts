import test from "node:test";
import assert from "node:assert/strict";
import { buildLobaSystemPrompt, sanitizeLobaMessages } from "@/lib/loba-ai";

test("LOBA IA ancre les réponses sur les KPI et le radar produit",()=>{
 const prompt=buildLobaSystemPrompt({kpis:{users:21,households:25},insights:[],funnel:[],productRadar:[{title:"Factures & Budget",value:"Échéances et vision mensuelle"}]});
 assert.match(prompt,/21/);
 assert.match(prompt,/Factures & Budget/);
 assert.match(prompt,/Ne fabrique jamais de KPI/);
});

test("LOBA IA limite et nettoie l'historique envoyé au modèle",()=>{
 const history=Array.from({length:14},(_,i)=>({role:i%2?"assistant" as const:"user" as const,content:`message ${i}`}));
 const cleaned=sanitizeLobaMessages(history);
 assert.equal(cleaned.length,10);
 assert.equal(cleaned[0].content,"message 4");
 assert.equal(cleaned.at(-1)?.content,"message 13");
});
