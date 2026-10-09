import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {readClosedLoopJson,ClosedLoopRequestError} from "../lib/closed-loop-request";
const proposals=readFileSync("app/api/closed-loop/proposals/route.ts","utf8");
const execution=readFileSync("app/api/closed-loop/materialize/route.ts","utf8");
test("V5.1 limits JSON bodies on both API routes",()=>{
 assert.match(proposals,/readClosedLoopJson\(req\)/);
 assert.match(execution,/readClosedLoopJson\(req\)/);
 assert.doesNotMatch(proposals,/req\.json\(\)/);
 assert.doesNotMatch(execution,/req\.json\(\)/);
});
test("V5.1 rejects oversized declared and streamed requests",async()=>{
 const declared=new Request("https://example.test",{method:"POST",headers:{"content-length":"20000"},body:"{}"});
 await assert.rejects(()=>readClosedLoopJson(declared),e=>e instanceof ClosedLoopRequestError&&e.status===413);
 const streamed=new Request("https://example.test",{method:"POST",body:"x".repeat(17000)});
 await assert.rejects(()=>readClosedLoopJson(streamed),e=>e instanceof ClosedLoopRequestError&&e.status===413);
});
test("V5.1 rejects malformed JSON and accepts bounded JSON",async()=>{
 const malformed=new Request("https://example.test",{method:"POST",body:"{"});
 await assert.rejects(()=>readClosedLoopJson(malformed),e=>e instanceof ClosedLoopRequestError&&e.status===400);
 const valid=new Request("https://example.test",{method:"POST",body:JSON.stringify({approved:true})});
 assert.deepEqual(await readClosedLoopJson(valid),{approved:true});
});
test("V5.1 limits optional plan fields",()=>{
 assert.match(proposals,/a\.quantity\.length>120/);
 assert.match(proposals,/a\.eventDate\.length>10/);
 assert.match(proposals,/a\.dueOn\.length>10/);
});
