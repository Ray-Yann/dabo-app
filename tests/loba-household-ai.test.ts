import test from "node:test";
import assert from "node:assert/strict";
import { buildHouseholdPrompt, sanitizeHouseholdHistory } from "@/lib/loba-household-ai";

test("LOBA foyer reste ancrée au foyer actif et n’écrit jamais sans confirmation",()=>{
 const prompt=buildHouseholdPrompt({household:{id:"h1",name:"Maison"},currentMember:{id:"m1",firstName:"Ray",language:"fr"},members:[{id:"m1",firstName:"Ray"}],tasks:[{id:"t1",name:"Vaisselle",status:"pending",urgent:false,dueDate:null,assignedTo:"m1"}],shopping:[],events:[],balance:[],generatedAt:"2026-09-09T00:00:00.000Z"});
 assert.match(prompt,/confirmation explicite/i); assert.match(prompt,/Vaisselle/); assert.match(prompt,/foyer actif/i); assert.match(prompt,/ne l.exécutes jamais toi-même/i);
});

test("LOBA foyer limite l'historique conversationnel",()=>{
 const rows=Array.from({length:12},(_,i)=>({role:(i%2?"assistant":"user") as "assistant"|"user",content:`message ${i}`}));
 const clean=sanitizeHouseholdHistory(rows); assert.equal(clean.length,8); assert.equal(clean[0].content,"message 4");
});

test("LOBA foyer Phase 2 prépare seulement shopping.add avec confirmation",()=>{
 const prompt=buildHouseholdPrompt({household:{id:"h1",name:"Maison"},currentMember:{id:"m1",firstName:"Ray",language:"fr"},members:[{id:"m1",firstName:"Ray"}],tasks:[],shopping:[],events:[],balance:[],generatedAt:"2026-09-09T00:00:00.000Z"});
 assert.match(prompt,/shopping\.add/); assert.match(prompt,/confirmation explicite/i); assert.match(prompt,/Ne dis jamais que l'article est déjà ajouté/i);
});
