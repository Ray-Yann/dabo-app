import test from "node:test";
import assert from "node:assert/strict";
import { normalizeHouseholdAction, parseLobaHouseholdEnvelope } from "@/lib/loba-household-actions";

test("LOBA Phase 2 accepte uniquement un ajout courses borné",()=>{
 assert.deepEqual(normalizeHouseholdAction({type:"shopping.add",item:"  Lait  ",quantity:"2 bouteilles"}),{type:"shopping.add",item:"Lait",quantity:"2 bouteilles"});
 assert.equal(normalizeHouseholdAction({type:"task.delete",item:"Vaisselle"}),null);
 assert.equal(normalizeHouseholdAction({type:"shopping.add",item:"   "}),null);
});

test("LOBA Phase 2 sépare réponse et proposition sans exécuter",()=>{
 const out=parseLobaHouseholdEnvelope(JSON.stringify({answer:"Je peux le préparer.",proposedAction:{type:"shopping.add",item:"Pain",quantity:null}}));
 assert.equal(out.answer,"Je peux le préparer."); assert.equal(out.proposedAction?.type,"shopping.add"); assert.equal(out.proposedAction?.item,"Pain");
});
