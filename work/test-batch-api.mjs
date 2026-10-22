import {spawn} from 'node:child_process';import path from 'node:path';import assert from 'node:assert/strict';
const proc=spawn(path.resolve('runtime/node.exe'),['server.mjs'],{env:{...process.env,PORT:'3091',DATA_DIR:path.resolve('work/batch-check-'+Date.now()),APP_PASSWORD:''},stdio:['ignore','pipe','pipe']});
try{
 await new Promise((ok,fail)=>{proc.stdout.once('data',ok);proc.once('error',fail);proc.once('exit',c=>fail(Error('server exit '+c)));});
 const call=async(p,b)=>{const r=await fetch('http://127.0.0.1:3091'+p,{method:b?'POST':'GET',headers:{'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined,signal:AbortSignal.timeout(5000)});return {status:r.status,data:await r.json()};};
 let s=(await call('/api/state')).data;const revision=s.revision;
 const rows=s.employees.slice(0,2).map((e,i)=>({employeeId:e.id,month:'2026-09',leave:i+.5,late:i,note:'batch test'}));
 let r=await call('/api/records',{revision,records:[rows[0],{...rows[1],late:-1}]});assert.equal(r.status,400);s=(await call('/api/state')).data;assert.equal(s.revision,revision);assert.equal(s.records.length,0);
 r=await call('/api/records',{revision,records:rows});assert.equal(r.status,200);s=(await call('/api/state')).data;assert.equal(s.records.length,2);assert.equal(s.revision,revision+1);
 assert.equal((await call('/api/records',{revision,records:rows})).status,409);
 rows[0].leave=2;assert.equal((await call('/api/records',{revision:s.revision,records:rows})).status,200);s=(await call('/api/state')).data;assert.equal(s.records.length,2);assert.equal(s.records[0].leave,2);
 console.log('PASS API batch: atomic rejection, persistence, revision conflict and replacement without duplicate records');
}finally{proc.kill();}
