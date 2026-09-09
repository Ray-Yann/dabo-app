import test from "node:test";
import assert from "node:assert/strict";
import { normalizeHouseholdAction, parseLobaHouseholdEnvelope, taskActionPoints } from "@/lib/loba-household-actions";

test("LOBA Phase 2 accepte un ajout courses borné",()=>{
 assert.deepEqual(normalizeHouseholdAction({type:"shopping.add",item:"  Lait  ",quantity:"2 bouteilles"}),{type:"shopping.add",item:"Lait",quantity:"2 bouteilles"});
 assert.equal(normalizeHouseholdAction({type:"task.delete",item:"Vaisselle"}),null);
 assert.equal(normalizeHouseholdAction({type:"shopping.add",item:"   "}),null);
});

test("LOBA Tâches accepte seulement une création complète et bornée",()=>{
 const action=normalizeHouseholdAction({type:"task.add",name:" Nettoyer la salle de bain ",dueDate:"2026-09-10",assignedTo:null,urgent:false,durationKey:"30min",effortLevel:"moyen"});
 assert.ok(action && action.type==="task.add");
 if(action?.type==="task.add") assert.equal(taskActionPoints(action),25);
 assert.equal(normalizeHouseholdAction({type:"task.add",name:"Test",dueDate:"2026-02-30",assignedTo:null,urgent:false,durationKey:"30min",effortLevel:"moyen"}),null);
 assert.equal(normalizeHouseholdAction({type:"task.add",name:"Test",dueDate:null,assignedTo:null,urgent:false,durationKey:"inventé",effortLevel:"moyen"}),null);
});

test("LOBA sépare réponse et proposition sans exécuter",()=>{
 const out=parseLobaHouseholdEnvelope(JSON.stringify({answer:"Je peux le préparer.",proposedAction:{type:"shopping.add",item:"Pain",quantity:null}}));
 assert.equal(out.answer,"Je peux le préparer."); assert.equal(out.proposedAction?.type,"shopping.add");
});

test("LOBA Calendrier accepte seulement une création datée et à portée explicite",()=>{
 assert.deepEqual(normalizeHouseholdAction({type:"calendar.add",title:" Dentiste — 14h ",eventDate:"2026-09-11",visibility:"personal",recurring:false}),{type:"calendar.add",title:"Dentiste — 14h",eventDate:"2026-09-11",visibility:"personal",recurring:false});
 assert.equal(normalizeHouseholdAction({type:"calendar.add",title:"Dentiste",eventDate:"2026-09-11",visibility:"other",recurring:false}),null);
 assert.equal(normalizeHouseholdAction({type:"calendar.add",title:"Dentiste",eventDate:"2026-09-11",visibility:"personal",recurring:true}),null);
 assert.equal(normalizeHouseholdAction({type:"calendar.add",title:"Dentiste",eventDate:"2026-02-30",visibility:"personal",recurring:false}),null);
});
