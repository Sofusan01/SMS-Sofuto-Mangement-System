import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {passwordHash} from '../auth.mjs';
const root=process.cwd(),dir=fs.mkdtempSync(path.join(root,'work','office-test-'));
const pass='Test-only-'+crypto.randomUUID();
fs.writeFileSync(path.join(dir,'access.json'),JSON.stringify(passwordHash(pass)));
const port=13983;
let child;
async function start(){
 child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',OFFICE_MODE:'1',DATA_DIR:dir},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{let log='';const timer=setTimeout(()=>reject(Error('Server startup timed out: '+log)),10000);child.stdout.on('data',d=>{log+=d;if(log.includes('ready')){clearTimeout(timer);resolve()}});child.stderr.on('data',d=>log+=d);child.on('exit',code=>{clearTimeout(timer);reject(Error('Server exit '+code+log))});});
}
async function stop(){if(child?.exitCode===null){await new Promise(resolve=>{child.once('exit',resolve);child.kill()});}}
async function req(route,body,cookie){return fetch('http://127.0.0.1:'+port+route,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(5000)});}
async function login(){const r=await req('/api/login',{password:pass});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}
try{
 await start();assert.equal((await req('/api/state')).status,401);assert.equal((await req('/api/source')).status,401);
 assert.equal((await req('/api/login',{password:'incorrect'})).status,401);
 let cookie=await login();let state=await (await req('/api/state',null,cookie)).json();
 assert.equal(state.archives['2026-08'].length,23);assert.equal(state.archives['2026-08'].find(r=>r.employeeId==='10').total,600);
 assert.deepEqual(state.archives['2026-08'],JSON.parse(fs.readFileSync('august-history.json','utf8')));
 const saved=await req('/api/records',{revision:state.revision,records:[{employeeId:'10',month:'2026-09',leave:0.5,late:2,note:'test'}]},cookie);assert.equal(saved.status,200);
 const before=await (await req('/api/report?month=2026-09',null,cookie)).json();assert.equal(before.find(r=>r.employeeId==='10').total,125);
 await stop();await start();assert.equal((await req('/api/state',null,cookie)).status,401);cookie=await login();
 assert.deepEqual(await(await req('/api/report?month=2026-09',null,cookie)).json(),before);
 const backupProcess=spawn(process.execPath,['backup-db.mjs'],{cwd:root,env:{...process.env,DATA_DIR:dir},stdio:'pipe'});
 assert.equal(await new Promise(resolve=>backupProcess.on('exit',resolve)),0);
 const file=fs.readdirSync(path.join(dir,'backups'))[0];const db=new DatabaseSync(path.join(dir,'backups',file),{readOnly:true});
 assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.equal(JSON.parse(db.prepare('SELECT json FROM state').get().json).records.length,1);db.close();
 assert.equal((await req('/api/logout',{},cookie)).status,200);assert.equal((await req('/api/state',null,cookie)).status,401);
 for(let i=0;i<10;i++)assert.equal((await req('/api/login',{password:'wrong'})).status,401);
 assert.equal((await req('/api/login',{password:'wrong'})).status,429);
 const newer='New-test-'+crypto.randomUUID();
fs.writeFileSync(path.join(dir,'access.json'),JSON.stringify(passwordHash(newer)));
const newLogin=await req('/api/login',{password:newer});assert.equal(newLogin.status,200);
assert.equal((await req('/api/login',{password:pass})).status,401);
const newCookie=newLogin.headers.get('set-cookie').split(';')[0];
fs.writeFileSync(path.join(dir,'access.json'),JSON.stringify(passwordHash('Third-test-'+crypto.randomUUID())));
assert.equal((await req('/api/state',null,newCookie)).status,401);
console.log('PASS: hot password reset clears rate limit, new password works, old password and sessions rejected.');
console.log('PASS: auth gating, invalid password, archive migration (23 employees / 600 baht), persistent monthly data, SQLite backup integrity, logout, login rate limit.');
}finally{await stop();}

