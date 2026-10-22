import fs from 'node:fs';import assert from 'node:assert/strict';import {calculate} from '../engine.mjs';
const get=async p=>{const r=await fetch('http://127.0.0.1:3082'+p,{signal:AbortSignal.timeout(5000)});assert.equal(r.status,200);return r;};
const before=JSON.parse(fs.readFileSync('work/prehistory-state.json','utf8')),state=await(await get('/api/state')).json();
for(const key of ['employees','records','policy','revision'])assert.deepEqual(state[key],before[key]);
const august=await(await get('/api/report?month=2026-08')).json();assert.deepEqual(august,JSON.parse(fs.readFileSync('august-history.json','utf8')));assert.equal(august.length,23);assert.equal(august.reduce((s,r)=>s+r.leave,0),8);assert.equal(august.reduce((s,r)=>s+r.late,0),3);
const september=await(await get('/api/report?month=2026-09')).json();assert.deepEqual(september,state.employees.map(e=>calculate(e,state.records,'2026-09',state.policy)).filter(Boolean));
const source=await get('/api/source');assert.match(source.headers.get('content-type'),/spreadsheetml/);const bytes=new Uint8Array(await source.arrayBuffer());assert.equal(bytes[0],80);assert.equal(bytes[1],75);
assert.match(await(await get('/')).text(),/value="2026-08"/);
console.log('PASS: August API exposes all 23 source rows; state revision/employees/records/policy unchanged; September fully unchanged; original XLSX downloads; app opens August by default');
