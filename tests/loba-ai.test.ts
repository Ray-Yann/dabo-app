import test from "node:test";
import assert from "node:assert/strict";
import { buildLobaSystemPrompt, detectLobaIntent, sanitizeLobaMessages } from "@/lib/loba-ai";

test("LOBA IA ancre les réponses sur les KPI, capacités et pistes produit",()=>{
 const prompt=buildLobaSystemPrompt({kpis:{users:21,households:25},insights:[],funnel:[],productCapabilities:[{title:"Finances",value:"Dépenses et factures"}],productRadar:[{title:"Documents du foyer",value:"Garanties et contrats"}]});
 assert.match(prompt,/21/);
 assert.match(prompt,/Finances/);
 assert.match(prompt,/Documents du foyer/);
 assert.match(prompt,/Ne fabrique jamais de KPI/);
});

test("LOBA IA limite et nettoie l'historique envoyé au modèle",()=>{
 const history=Array.from({length:14},(_,i)=>({role:i%2?"assistant" as const:"user" as const,content:`message ${i}`}));
 const cleaned=sanitizeLobaMessages(history);
 assert.equal(cleaned.length,10);
 assert.equal(cleaned[0].content,"message 4");
 assert.equal(cleaned.at(-1)?.content,"message 13");
});

test("LOBA IA impose une réponse proportionnée et une discipline stricte sur les faits",()=>{
 const prompt=buildLobaSystemPrompt({kpis:{activeHouseholds30d:0},insights:[],funnel:[]});
 assert.match(prompt,/2 à 4 courts paragraphes/);
 assert.match(prompt,/le cockpit affiche 0/);
 assert.match(prompt,/INTERPRÉTATION/);
 assert.match(prompt,/grands tableaux/);
});


test("LOBA IA V1.3 détecte l’intention avant de choisir la profondeur",()=>{
 assert.equal(detectLobaIntent("Documents du foyer, ça servirait à quoi dans DABO ?"),"simple");
 assert.equal(detectLobaIntent("Analyse nos KPI et dis-moi pourquoi l’activation baisse"),"analysis");
 assert.equal(detectLobaIntent("Quelle stratégie de croissance recommandes-tu ?"),"strategy");
 assert.equal(detectLobaIntent("Prépare un résumé pour un investisseur"),"investor");
});

test("LOBA IA V1.3 interdit les chiffres DABO non ancrés et garde la conversation simple naturelle",()=>{
 const prompt=buildLobaSystemPrompt({kpis:{households:27},insights:[],funnel:[]},"simple");
 assert.match(prompt,/unique source de vérité pour les chiffres concernant DABO/);
 assert.match(prompt,/N'impose PAS les rubriques FAIT DABO/);
 assert.match(prompt,/ni plan d'action, ni métriques, ni sondage, ni MVP/);
 assert.match(prompt,/hypothèse à tester/);
});
