import test from "node:test";
import assert from "node:assert/strict";
import { calculateRetention } from "@/lib/retention";

const at = (day:number, hour=0) => new Date(Date.UTC(2026,8,1+day,hour)).toISOString();
const signup = (visitor:string, day=0, user:string|null=null) => ({event_name:"signup_completed",visitor_id:visitor,user_id:user,created_at:at(day)});
const open = (visitor:string, day:number, user:string|null=null) => ({event_name:"app_open",visitor_id:visitor,user_id:user,created_at:at(day,2)});

test("rétention J1 suit le même inscrit dans la fenêtre D+1",()=>{
  const r=calculateRetention([signup("a"),open("a",1)],new Date(Date.UTC(2026,8,3)).getTime());
  assert.equal(r.j1.eligible,1); assert.equal(r.j1.retained,1); assert.equal(r.j1.rate,100);
});

test("une ouverture avant J7 ne compte pas comme rétention J7",()=>{
  const r=calculateRetention([signup("a"),open("a",6)],new Date(Date.UTC(2026,8,10)).getTime());
  assert.equal(r.j7.eligible,1); assert.equal(r.j7.retained,0);
});

test("une cohorte non mûre reste non éligible",()=>{
  const r=calculateRetention([signup("a",8)],new Date(Date.UTC(2026,8,10)).getTime());
  assert.equal(r.j7.eligible,0); assert.equal(r.j7.rate,0);
});

test("les inscriptions dupliquées d'une même identité ne doublent pas la cohorte",()=>{
  const events=[signup("a",0,"u1"),signup("b",0,"u1"),open("x",1,"u1")];
  const r=calculateRetention(events,new Date(Date.UTC(2026,8,3)).getTime());
  assert.equal(r.measuredSignups,1); assert.equal(r.j1.retained,1);
});

test("un petit échantillon est marqué données insuffisantes",()=>{
  const r=calculateRetention([signup("a"),open("a",1)],new Date(Date.UTC(2026,8,3)).getTime());
  assert.equal(r.j1.sufficient,false);
});
