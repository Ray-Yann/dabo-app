import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const src=readFileSync(new URL('../app/app/courses/repas/page.tsx',import.meta.url),'utf8');
const match=src.match(/const validDay = \(value:string\) => \{[\s\S]*?\n\};/);
assert.ok(match,'calendar validation helper exists');
const validDay=vm.runInNewContext(`${match[0].replace('(value:string)','(value)')}\nvalidDay`);
test('accepts genuine calendar days including leap years',()=>{
 for(const day of ['2024-02-29','2026-10-29','2000-02-29','0001-01-01','9999-12-31'])assert.equal(validDay(day),true,day);
});
test('rejects impossible calendar dates and malformed input',()=>{
 for(const day of ['','2026-02-29','1900-02-29','2026-04-31','2026-13-01','2026-00-10','2026-01-00','2026-01-32','2026-1-1','2026-01-01T00:00:00'])assert.equal(validDay(day),false,day);
});
test('date input validates before invalidating selection context',()=>{
 assert.match(src,/onChange=\{e=>\{if\(!validDay\(e\.target\.value\)\)return;requestSequence\.current\+\+/);
});

test('week end stays within four-digit calendar years and handles year 0001',()=>{
 const line=src.match(/^const addDays = .*;$/m);
 assert.ok(line,'week arithmetic helper exists');
 const addDays=vm.runInNewContext(`${line[0].replace('(iso:string, days:number)','(iso, days)')}\naddDays`);
 assert.equal(addDays('2026-12-29',6),'2027-01-04');
 assert.equal(addDays('0001-01-01',6),'0001-01-07');
 assert.equal(addDays('9999-12-29',6),'9999-12-31');
 assert.equal(addDays('9999-12-31',6),'9999-12-31');
});
