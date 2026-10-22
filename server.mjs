import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {branches,validateEmployee,validateRecord,calculate,prepareMonthlyBatch} from './engine.mjs';
import {loadAccess,verifyPassword} from './auth.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const dataDir=process.env.DATA_DIR||path.join(root,'data');fs.mkdirSync(dataDir,{recursive:true});
const db=new DatabaseSync(path.join(dataDir,'c1conclude.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS state(id INTEGER PRIMARY KEY, json TEXT NOT NULL);`);
const seed=JSON.parse(fs.readFileSync(path.join(root,'seed.json'),'utf8'));
const augustHistory=JSON.parse(fs.readFileSync(path.join(root,'august-history.json'),'utf8'));
if(!db.prepare('SELECT id FROM state WHERE id=1').get())db.prepare('INSERT INTO state VALUES(1,?)').run(JSON.stringify({employees:seed.employees,records:[],policy:{resetMonth:1},revision:1}));
const read=()=>JSON.parse(db.prepare('SELECT json FROM state WHERE id=1').get().json);
const write=s=>{s.revision++;db.prepare('UPDATE state SET json=? WHERE id=1').run(JSON.stringify(s));};
// Keep existing records while normalizing the source workbook's branch spelling.
const existing=read();let normalized=false;
// Preserve historical confirmations in SQLite once, without reapplying leave usage.
if(!existing.archives){
 fs.writeFileSync(path.join(dataDir,`before-archive-migration-${Date.now()}.json`),JSON.stringify(existing));
 existing.archives={'2026-08':augustHistory};normalized=true;
}
for(const e of existing.employees)if(e.branch==='โพธิ์ชัย'){e.branch='โพธิชัย';normalized=true;}
if(normalized)write(existing);
const port=Number(process.env.PORT||3082),host=process.env.HOST||'127.0.0.1';
const token=process.env.APP_PASSWORD||'';
let access=loadAccess(path.join(dataDir,'access.json'));
let authRequired=Boolean(access||token);
if((process.env.OFFICE_MODE==='1'||(host!=='127.0.0.1'&&host!=='localhost'))&&!authRequired){console.error('Configure an app password before starting the office server.');process.exit(1);}
const sessions=new Map();
const attempts=new Map();
function refreshAccess(){
 const latest=loadAccess(path.join(dataDir,'access.json'));
 if(access&&!latest)throw Error('ไม่พบการตั้งค่ารหัสผ่าน กรุณาตรวจสอบที่เครื่องแม่ข่าย');
 if(JSON.stringify(latest)!==JSON.stringify(access)){
  access=latest;authRequired=Boolean(access||token);
  sessions.clear();attempts.clear();
 }
}
setInterval(()=>{const now=Date.now();for(const [k,v] of sessions)if(v<now)sessions.delete(k);for(const [k,v] of attempts)if(v.until<now)attempts.delete(k);},60000).unref();
function send(res,status,data,type='application/json; charset=utf-8'){res.writeHead(status,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});res.end(type.startsWith('application/json')?JSON.stringify(data):data);}
async function body(req){let b='';for await(const chunk of req){b+=chunk;if(Buffer.byteLength(b)>2e6)throw Error('ข้อมูลเกินขนาด 2 MB');}return JSON.parse(b||'{}');}
function validState(s){
 if(!s||!Array.isArray(s.employees)||!Array.isArray(s.records)||s.employees.length>1000||s.records.length>50000)throw Error('ไฟล์สำรองไม่ถูกต้อง');
 const ids=new Set();for(const e of s.employees){validateEmployee(e);if(typeof e.id!=='string'||ids.has(e.id))throw Error('รหัสพนักงานซ้ำหรือไม่ถูกต้อง');ids.add(e.id);}
 const keys=new Set();for(const r of s.records){validateRecord(r);const e=s.employees.find(e=>e.id===r.employeeId);if(!e||r.month<e.start)throw Error('รายการอยู่นอกช่วงพนักงาน');const k=r.employeeId+'|'+r.month;if(keys.has(k))throw Error('รายการเดือนซ้ำ');keys.add(k);}
 if(!Number.isInteger(s.policy?.resetMonth)||s.policy.resetMonth<1||s.policy.resetMonth>12)throw Error('เดือนรีเซ็ตไม่ถูกต้อง');
 if(s.archives!==undefined){
  if(!s.archives||Array.isArray(s.archives)||typeof s.archives!=='object')throw Error('ประวัติไม่ถูกต้อง');
  for(const [month,rows] of Object.entries(s.archives)){
   if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)||!Array.isArray(rows)||rows.length>1000)throw Error('ประวัติไม่ถูกต้อง');
   for(const r of rows)if(!r||r.month!==month||r.archive!==true||typeof r.employeeId!=='string'||typeof r.name!=='string'||!branches.includes(r.branch))throw Error('ข้อมูลประวัติไม่ถูกต้อง');
  }
 }
}
http.createServer(async(req,res)=>{try{
 refreshAccess();
 const url=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&url.pathname==='/health')return send(res,200,{ok:true,authRequired,officeMode:process.env.OFFICE_MODE==='1',passwordReload:true});
 if(req.method==='POST'&&req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return send(res,403,{error:'ไม่อนุญาตคำขอข้ามเว็บไซต์'});
 if(req.method==='POST'&&url.pathname==='/api/login'){
  const key=req.socket.remoteAddress||'unknown',now=Date.now();
  const attempt=attempts.get(key);
  if(attempt&&attempt.until>now&&attempt.count>=10)return send(res,429,{error:'ลองรหัสผ่านเกินจำนวน กรุณารอ 15 นาที'});
  const b=await body(req);const supplied=Buffer.from(String(b.password||'')),expected=Buffer.from(token);
  refreshAccess();
  const correct=access?verifyPassword(b.password,access):(!token||(supplied.length===expected.length&&crypto.timingSafeEqual(supplied,expected)));
  if(!correct){attempts.set(key,{count:(attempt&&attempt.until>now?attempt.count:0)+1,until:now+15*60000});return send(res,401,{error:'รหัสผ่านไม่ถูกต้อง'});}
  attempts.delete(key);
  const sid=crypto.randomBytes(32).toString('hex');sessions.set(sid,Date.now()+12*3600000);res.setHeader('Set-Cookie',`c1session=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${process.env.COOKIE_SECURE==='1'?'; Secure':''}`);return send(res,200,{ok:true});
 }
 if(url.pathname.startsWith('/api/')){
  const sid=/c1session=([a-f0-9]+)/.exec(req.headers.cookie||'')?.[1];
  if(authRequired&&(!sid||sessions.get(sid)<Date.now()||!sessions.has(sid)))return send(res,401,{error:'กรุณาเข้าสู่ระบบ'});
  if(req.method==='POST'&&url.pathname==='/api/logout'){sessions.delete(sid);res.setHeader('Set-Cookie','c1session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return send(res,200,{ok:true});}
  if(req.method==='POST'&&req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return send(res,403,{error:'ไม่อนุญาตคำขอข้ามเว็บไซต์'});
  let s=read();
  if(req.method==='GET'&&url.pathname==='/api/state')return send(res,200,{...s,branches,source:seed.source,archiveMonths:['2026-08']});
  if(req.method==='GET'&&url.pathname==='/api/source'){
   res.setHeader('Content-Disposition',"attachment; filename=August-2569-original.xlsx");
   return send(res,200,fs.readFileSync(path.join(root,'สิงหาคม2569.xlsx')),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }
  if(req.method==='GET'&&url.pathname==='/api/report'){
   const month=url.searchParams.get('month');if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month))throw Error('เดือนไม่ถูกต้อง');
   if(s.archives?.[month])return send(res,200,s.archives[month]);
   return send(res,200,s.employees.map(e=>calculate(e,s.records,month,s.policy)).filter(Boolean));
  }
  if(req.method==='POST'){
   const b=await body(req);
   s=read(); // Recheck the revision after reading the request body.
   if(b.revision!==s.revision)return send(res,409,{error:'ข้อมูลถูกแก้ไขจากหน้าต่างอื่น กรุณาโหลดใหม่ก่อนบันทึก'});
   if(url.pathname==='/api/employee'){
    const e={id:b.id||crypto.randomUUID(),name:String(b.name||'').trim(),branch:b.branch,balance:Number(b.balance),carry:Number(b.carry),start:b.start};validateEmployee(e);
    const old=s.employees.find(x=>x.id===e.id);
    if(s.records.some(r=>r.employeeId===e.id&&r.month<e.start))throw Error('เดือนเริ่มต้นใหม่ทับข้อมูลรายเดือนที่มีอยู่');
    if(old)s.employees=s.employees.map(x=>x.id===e.id?e:x);else s.employees.push(e);
   }else if(url.pathname==='/api/records'){
    const batch=prepareMonthlyBatch(s.employees,b.records);
    const keys=new Set(batch.map(r=>r.employeeId+'|'+r.month));
    s.records=s.records.filter(r=>!keys.has(r.employeeId+'|'+r.month)).concat(batch);
   }else if(url.pathname==='/api/record'){
    const e=s.employees.find(x=>x.id===b.employeeId);if(!e)throw Error('ไม่พบพนักงาน');
    const r={employeeId:e.id,month:b.month,leave:Number(b.leave),late:Number(b.late),note:b.note||''};validateRecord(r);if(r.month<e.start)throw Error('เดือนก่อนยอดเริ่มต้น บันทึกไม่ได้');
    s.records=s.records.filter(x=>!(x.employeeId===r.employeeId&&x.month===r.month));s.records.push(r);
   }else if(url.pathname==='/api/delete-record')s.records=s.records.filter(x=>!(x.employeeId===b.employeeId&&x.month===b.month));
   else if(url.pathname==='/api/delete-employee'){
    if(s.records.some(x=>x.employeeId===b.id))throw Error('ลบไม่ได้: พนักงานมีรายการรายเดือนอยู่');s.employees=s.employees.filter(x=>x.id!==b.id);
   }else if(url.pathname==='/api/policy'){
    if(!Number.isInteger(b.resetMonth)||b.resetMonth<1||b.resetMonth>12)throw Error('เดือนรีเซ็ตไม่ถูกต้อง');s.policy={resetMonth:b.resetMonth};
   }else if(url.pathname==='/api/import'){
    const es=b.employees;if(!Array.isArray(es)||es.length===0)throw Error('ไม่มีข้อมูลนำเข้า');
    for(const e of es){validateEmployee(e);e.id=crypto.randomUUID();if(s.employees.some(x=>x.name===e.name&&x.branch===e.branch))throw Error('พบชื่อซ้ำในสาขา กรุณาแก้ยอดจากหน้าพนักงานแทนการนำเข้าซ้ำ');s.employees.push(e);}
   }else if(url.pathname==='/api/restore'){
    validState(b.state);fs.writeFileSync(path.join(dataDir,`before-restore-${Date.now()}.json`),JSON.stringify(s));s={...b.state,archives:b.state.archives??s.archives,revision:s.revision};
   }else return send(res,404,{error:'ไม่พบคำสั่ง'});
   validState(s);write(s);return send(res,200,{ok:true});
  }
  return send(res,404,{error:'ไม่พบคำสั่ง'});
 }
 if(req.method!=='GET')return send(res,405,{error:'ไม่รองรับ'});
 const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/menu.css':'menu.css','/pdfmake.min.js':'vendor/pdfmake.min.js','/thai-fonts.js':'vendor/thai-fonts.js','/jszip.min.js':'jszip.min.js'};
 const f=files[url.pathname];if(!f)return send(res,404,'Not found','text/plain');
 const type=f.endsWith('.js')?'text/javascript; charset=utf-8':f.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8';
 send(res,200,fs.readFileSync(path.join(root,'public',f)),type);
}catch(e){send(res,400,{error:e.message||'เกิดข้อผิดพลาด'});}}).listen(port,host,()=>console.log(`C1CONCLUDE ready at http://${host}:${port}`));
