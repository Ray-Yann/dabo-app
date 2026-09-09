import test from "node:test";
import assert from "node:assert/strict";
import { buildHouseholdPrompt, sanitizeHouseholdHistory } from "@/lib/loba-household-ai";

test("LOBA foyer reste en lecture seule et ancrée au foyer actif",()=>{
 const prompt=buildHouseholdPrompt({household:{id:"h1",name:"Maison"},currentMember:{id:"m1",firstName:"Ray",language:"fr"},members:[{id:"m1",firstName:"Ray"}],tasks:[{id:"t1",name:"Vaisselle",status:"pending",urgent:false,dueDate:null,assignedTo:"m1"}],shopping:[],events:[],balance:[],generatedAt:"2026-09-09T00:00:00.000Z"});
 assert.match(prompt,/LECTURE SEULE/); assert.match(prompt,/Vaisselle/); assert.match(prompt,/foyer actif/i); assert.match(prompt,/Ne prétends jamais avoir effectué une action/);
});

test("LOBA foyer limite l'historique conversationnel",()=>{
 const rows=Array.from({length:12},(_,i)=>({role:(i%2?"assistant":"user") as "assistant"|"user",content:`message ${i}`}));
 const clean=sanitizeHouseholdHistory(rows); assert.equal(clean.length,8); assert.equal(clean[0].content,"message 4");
});
