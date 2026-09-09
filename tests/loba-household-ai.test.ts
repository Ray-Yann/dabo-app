import test from "node:test";
import assert from "node:assert/strict";

import { buildHouseholdPrompt, sanitizeHouseholdHistory } from "@/lib/loba-household-ai";

test("LOBA foyer reste ancrée au foyer actif et n’écrit jamais sans confirmation", () => {
  const prompt = buildHouseholdPrompt({
    household: { id: "h1", name: "Maison" },
    currentMember: { id: "m1", firstName: "Ray", language: "fr" },
    members: [{ id: "m1", firstName: "Ray" }],
    tasks: [{ id: "t1", name: "Vaisselle", status: "pending", urgent: false, dueDate: null, assignedTo: "m1", durationKey: "15min", effortLevel: "faible", routineId: null }],
    shopping: [],
    events: [],
    balance: [],
    generatedAt: "2026-09-09T00:00:00.000Z",
  });

  assert.match(prompt, /foyer actif/i);
  assert.match(prompt, /ne les exécutes jamais toi-même/i);
  assert.match(prompt, /confirmation explicite/i);
  assert.match(prompt, /n'invente jamais/i);
});

test("LOBA foyer limite l'historique conversationnel", () => {
  const history = Array.from({ length: 20 }, (_, index) => ({
    role: index % 2 === 0 ? "user" as const : "assistant" as const,
    content: `message ${index} ${"x".repeat(500)}`,
  }));

  const sanitized = sanitizeHouseholdHistory(history);

  assert.ok(sanitized.length <= 8);
  assert.ok(sanitized.every((message) => message.content.length <= 1200));
});

test("LOBA foyer Phase 2 prépare seulement shopping.add avec confirmation", () => {
  const prompt = buildHouseholdPrompt({
    household: { id: "h1", name: "Maison" },
    currentMember: { id: "m1", firstName: "Ray", language: "fr" },
    members: [{ id: "m1", firstName: "Ray" }],
    tasks: [],
    shopping: [],
    events: [],
    balance: [],
    generatedAt: "2026-09-09T00:00:00.000Z",
  });

  assert.match(prompt, /shopping\.add/i);
  assert.match(prompt, /confirmation/i);
  assert.match(prompt, /task\.add/i);
});

test("LOBA Tâches exige durée et effort et refuse d'inventer une récurrence", () => {
  const prompt = buildHouseholdPrompt({
    household: { id: "h1", name: "Maison" },
    currentMember: { id: "m1", firstName: "Ray", language: "fr" },
    members: [{ id: "m1", firstName: "Ray" }],
    tasks: [],
    shopping: [],
    events: [],
    balance: [],
    generatedAt: "2026-09-09T00:00:00.000Z",
  });

  assert.match(prompt, /durée ET effort/i);
  assert.match(prompt, /aucune récurrence/i);
  assert.match(prompt, /assignedTo/i);
});

test("LOBA Calendrier exige une portée explicite et protège le personnel", () => {
  const prompt = buildHouseholdPrompt({
    household: { id: "h1", name: "Maison" },
    currentMember: { id: "m1", firstName: "Ray", language: "fr" },
    members: [{ id: "m1", firstName: "Ray" }, { id: "m2", firstName: "Manga" }],
    tasks: [], shopping: [], events: [], balance: [], generatedAt: "2026-09-09T00:00:00.000Z",
  });
  assert.match(prompt, /calendar\.add/i);
  assert.match(prompt, /Personnel ou pour tout le foyer/i);
  assert.match(prompt, /private_owner_id au membre connecté/i);
  assert.match(prompt, /aucune récurrence/i);
});

test("LOBA Actions complètes couvre Courses, Tâches et Calendrier avec confirmation", () => {
  const prompt = buildHouseholdPrompt({
    household:{id:"h1",name:"Maison"}, currentMember:{id:"m1",firstName:"Ray",language:"fr"},
    members:[{id:"m1",firstName:"Ray"},{id:"m2",firstName:"Manga"}],
    tasks:[{id:"t1",name:"Nettoyer ma chambre",status:"pending",urgent:false,dueDate:"2026-09-10",assignedTo:null,durationKey:"30min",effortLevel:"moyen",routineId:null}],
    shopping:[{id:"s1",name:"Lingettes",quantity:null,urgent:false,dueDate:null,assignedTo:null}],
    events:[{id:"e1",title:"Dîner",eventDate:"2026-09-12",recurring:false,visibility:"household"}],balance:[],generatedAt:"2026-09-09T00:00:00.000Z"
  });
  for (const action of ["shopping.update","shopping.delete","task.update","task.delete","calendar.update","calendar.delete"]) assert.match(prompt,new RegExp(action.replace(".","\\."),"i"));
  assert.match(prompt,/plusieurs éléments peuvent correspondre/i);
  assert.match(prompt,/suppression LOBA interdite si routineId/i);
  assert.match(prompt,/ne change jamais personal↔household/i);
  assert.match(prompt,/confirmation explicite/i);
});
