import test from"node:test";import assert from"node:assert/strict";
import{planClosedLoopNeed,proposeClosedLoop}from"../lib/closed-loop-reasoning";

test("Closed Loop V3 keeps backward-compatible reasoning entry point",()=>{
 assert.deepEqual(planClosedLoopNeed("Plus de lait"),proposeClosedLoop("Plus de lait"));
});

test("Closed Loop V3 turns a shortage into deterministic shopping truth",()=>{
 const p=planClosedLoopNeed("Il n'y a plus de lait");assert.ok(p);
 assert.equal(p.planKind,"shopping");assert.equal(p.resolutionMode,"deterministic");
 assert.deepEqual(p.actions.map(a=>[a.resourceType,a.role]),[["shopping_item","resolves"]]);
});

test("Closed Loop V3 repairs without hallucinating purchases",()=>{
 const p=planClosedLoopNeed("La machine Ã  laver fuit");assert.ok(p);
 assert.equal(p.planKind,"repair");assert.equal(p.resolutionMode,"human_required");
 assert.equal(p.actions.some(a=>a.resourceType==="shopping_item"),false);
 assert.deepEqual(p.actions.map(a=>a.phase),["prepare","execute","verify"]);
});

test("Closed Loop V3 never treats an appointment as proof of reality",()=>{
 const p=planClosedLoopNeed("Prendre rendez-vous au garage");assert.ok(p);
 assert.equal(p.planKind,"appointment");assert.equal(p.resolutionMode,"human_required");
 assert.equal(p.actions.find(a=>a.resourceType==="calendar_event")?.role,"progress");
 assert.equal(p.actions.at(-1)?.resourceType,"human_confirmation");
});

test("Closed Loop V3 maps payment to finance deterministic truth",()=>{
 const p=planClosedLoopNeed("Payer la facture internet");assert.ok(p);
 assert.equal(p.planKind,"payment");assert.equal(p.resolutionMode,"deterministic");
 assert.deepEqual(p.actions.map(a=>[a.resourceType,a.role]),[["finance_bill","resolves"]]);
});

test("Closed Loop V3 decomposes explicit buy-then-do instructions",()=>{
 const p=planClosedLoopNeed("Acheter une ampoule puis remplacer l'ampoule");assert.ok(p);
 assert.equal(p.requiresApproval,true);assert.equal(p.resolutionMode,"human_required");
 assert.deepEqual(p.actions.map(a=>a.resourceType),["shopping_item","task","human_confirmation"]);
});

test("Closed Loop V3 gives ambiguous needs a conservative human-verified fallback",()=>{
 const p=planClosedLoopNeed("S'occuper du dossier de la maison");assert.ok(p);
 assert.equal(p.planKind,"generic");assert.equal(p.resolutionMode,"human_required");
 assert.equal(p.actions.at(-1)?.resourceType,"human_confirmation");
});

test("Closed Loop V3 never auto-materialises a proposal",()=>{
 for(const input of["Plus de lait","La machine fuit","Payer le loyer","Préparer l'anniversaire de maman","Faire le rangement"]){
  assert.equal(planClosedLoopNeed(input)?.requiresApproval,true);
 }
});

