import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../app/app/courses/repas/page.tsx',import.meta.url),'utf8');
for(const [name,start,end] of [
 ['add','async function add(){','async function addMissingToShopping(){'],
 ['remove','async function remove(id:string){',' return <main']
]){
 test(`${name} recovers from rejected RPC and releases busy state`,()=>{
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a,'handler present');
  const handler=source.slice(a,b);
  assert.match(handler,/catch\(caught\)/);
  assert.match(handler,/finally\s*\{setBusy\(false\);\}/);
  assert.match(handler,/setError\(caught instanceof Error\?/);
 });
}
