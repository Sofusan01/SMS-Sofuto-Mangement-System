const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state,report=[],page='dashboard',editCallback;const titles={dashboard:['ภาพรวมการลาและมาสาย','ดูแลทีมทั้ง 5 สาขา ในพื้นที่เดียว'],monthly:['เพิ่มข้อมูลรายเดือน','เลือกเดือนและสาขา → กรอกลาและสาย → บันทึกพร้อมกัน'],employees:['พนักงานและยอดยกมา','จัดการรายชื่อ สิทธิคงเหลือ และสายสะสม ณ เดือนเริ่มต้น'],reports:['สรุป PDF / Excel','เลือกเดือนและสาขา ตรวจสรุป แล้วบันทึก PDF พร้อมช่องลายเซ็น'],settings:['ตั้งค่าและสำรองข้อมูล','จัดการรอบปี นำเข้ายอดตั้งต้น และรักษาข้อมูลของคุณ']};
const n=v=>Number(v||0).toLocaleString('th-TH',{maximumFractionDigits:2});
const monthLabel=m=>new Date(m+'-01T12:00:00').toLocaleDateString('th-TH',{month:'long',year:'numeric'});
function notify(msg,error=false){$('#notice').innerHTML=`<div class="toast ${error?'error':''}">${esc(msg)}</div>`;}
async function api(url,body){const r=await fetch(url,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify({...body,revision:state?.revision}):undefined});const d=await r.json();if(r.status===401&&url!=='/api/login'){login();throw Error('กรุณาเข้าสู่ระบบ');}if(!r.ok)throw Error(d.error||'เชื่อมต่อไม่ได้');return d;}
async function load(){state=await api('/api/state');$('#branch').innerHTML='<option value="">ทุกสาขา</option>'+state.branches.map(b=>`<option ${$('#branch').value===b?'selected':''}>${esc(b)}</option>`).join('');await refresh();}
async function refresh(){try{report=await api('/api/report?month='+$('#month').value);render();}catch(e){notify(e.message,true);}}
function filtered(rows){const b=$('#branch').value,q=$('#search').value.trim().toLowerCase();return rows.filter(r=>(!b||r.branch===b)&&r.name.toLowerCase().includes(q));}
function totals(rows){return rows.reduce((a,r)=>{for(const k of ['leave','late','total','unpaid','converted','balance'])a[k]=(a[k]||0)+r[k];return a;},{leave:0,late:0,total:0,unpaid:0,converted:0,balance:0});}
function cards(rows){const t=totals(rows);return `<div class="cards"><div class="card featured"><div class="card-label">พนักงานในรายงาน</div><div class="metric">${rows.length}<small>คน</small></div><small>จาก ${state.branches.length} สาขา</small></div><div class="card"><div class="card-label">ลาประจำเดือน</div><div class="metric">${n(t.leave)}<small>วัน</small></div><small>ใช้สิทธิ + เกินสิทธิ</small></div><div class="card"><div class="card-label">มาสายประจำเดือน</div><div class="metric">${n(t.late)}<small>ครั้ง</small></div><small>แปลงเป็นวันลา ${n(t.converted)} วัน</small></div><div class="card"><div class="card-label">ยอดหักรวม</div><div class="metric">${n(t.total)}<small>บาท</small></div><small>ลาเกินสิทธิและมาสายเมื่อสิทธิหมด</small></div></div>`;}
function table(rows,mode='report'){return `<div class="table-wrap"><table><thead><tr><th>พนักงาน / สาขา</th><th>สิทธิยกมา</th><th>ลา (วัน)</th><th>สาย (ครั้ง)</th><th>สายเป็นลา</th><th>สิทธิคงเหลือ</th><th>สายสะสม</th><th>หักเงิน (บาท)</th><th>${mode==='monthly'?'บันทึก':'รายละเอียด'}</th></tr></thead><tbody>${rows.map(r=>`<tr><td><span class="person">${esc(r.name)}</span><span class="sub">${esc(r.branch)}</span></td><td class="numeric">${n(r.opening)}</td><td class="numeric">${n(r.leave)}</td><td class="numeric">${n(r.late)}</td><td class="numeric">${n(r.converted)}</td><td class="numeric"><span class="badge ${r.balance===0?'danger':r.balance<=3?'warn':''}">${n(r.balance)} วัน</span></td><td class="numeric">${r.carry} / 6</td><td class="numeric money">${n(r.total)}</td><td><button class="plain" data-${mode==='monthly'?'record':'detail'}="${esc(r.employeeId)}">${mode==='monthly'?(r.saved?'แก้ไข':'บันทึก'):'ดูรายการ'}</button>${mode==='monthly'?`<span class="sub">${r.saved?'บันทึกแล้ว':'ยังไม่บันทึก'}</span>`:''}</td></tr>`).join('')||'<tr><td colspan="9" class="empty">ไม่พบพนักงานในเงื่อนไขที่เลือก</td></tr>'}</tbody></table></div>`;}
function render(){
 page=location.hash.slice(1)||'dashboard';if(!titles[page])page='dashboard';
 $('#title').textContent=titles[page][0];$('#subtitle').textContent=titles[page][1];$('#breadcrumb').textContent=titles[page][0];$('#period').textContent=monthLabel($('#month').value);
 document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('active',a.dataset.page===page));
 const rows=filtered(report),t=totals(rows);let html='';
 if($('#month').value==='2026-08'&&!['employees','settings'].includes(page)){html=archiveView(rows);$('#title').textContent='ประวัติสิงหาคม 2569';$('#subtitle').textContent='เดือนก่อนและเดือนปัจจุบัน ตามไฟล์ต้นฉบับ';}
 else if(page==='dashboard'){
  html=overviewIntro(rows)+cards(rows)+`<section class="panel"><div class="panel-head"><div><h2>ภาพรวมรายสาขา</h2><p>${monthLabel($('#month').value)} · เงื่อนไขตามตัวกรองด้านบน</p></div><a href="#reports" class="button secondary">ดูรายงานทั้งหมด ↗</a></div><div class="panel-body branch-grid">${state.branches.map(b=>{const rr=rows.filter(r=>r.branch===b),tt=totals(rr);return `<div class="branch-box"><strong>${b}</strong><div class="count">${rr.length} <small>คน</small></div><div class="bar"><span style="width:${Math.min(100,rr.filter(r=>r.saved).length/Math.max(1,rr.length)*100)}%"></span></div><small>บันทึกแล้ว ${rr.filter(r=>r.saved).length}/${rr.length} คน</small><div class="sub">ลา ${n(tt.leave)} วัน · สาย ${tt.late} ครั้ง</div><div class="money">${n(tt.total)} บาท</div></div>`;}).join('')}</div></section><section class="panel"><div class="panel-head"><div><h2>สรุปพนักงานประจำเดือน</h2><p>สิทธิเหลือน้อยและสิทธิหมด แสดงก่อน</p></div><a href="#monthly" class="button">+ บันทึกรายเดือน</a></div>${branchSummary(rows)}${table([...rows].sort((a,b)=>a.balance-b.balance))}</section>`;
 }else if(page==='monthly')html=monthlyEntry(rows);
 else if(page==='employees')html=`<div class="info">นำเข้าจากสิงหาคม2569.xlsx จำนวน 23 คน • เริ่มใช้ยอดคงเหลือในกันยายน 2569 • หัวรายงานต้นฉบับบางสาขาเป็นกรกฎาคม กรุณาตรวจยอดก่อนใช้งานจริง</div><section class="panel"><div class="panel-head"><div><h2>ทะเบียนพนักงาน</h2><p>ยอดตั้งต้นเป็นสิทธิที่ยังเหลือ ไม่ใช่จำนวนลาที่ใช้ไป</p></div><button id="add-employee">+ เพิ่มพนักงาน</button></div><div class="table-wrap"><table><thead><tr><th>พนักงาน</th><th>สาขา</th><th>เริ่มคำนวณ</th><th>สิทธิตั้งต้น</th><th>สายยกมา</th><th>จัดการ</th></tr></thead><tbody>${filtered(state.employees).map(e=>`<tr><td class="person">${esc(e.name)}</td><td>${e.branch}</td><td>${monthLabel(e.start)}</td><td>${n(e.balance)} วัน</td><td>${e.carry} ครั้ง</td><td><button class="plain" data-employee="${e.id}">แก้ไข</button><button class="plain" data-remove="${e.id}">ลบ</button></td></tr>`).join('')}</tbody></table></div></section>`;
 else if(page==='reports')html=reportScreen(rows);
 else html=`<div class="settings-grid"><section class="panel"><div class="panel-head"><h2>รอบปีและกติกาคำนวณ</h2></div><div class="panel-body help"><label>เดือนเริ่มรอบสิทธิลา 15 วัน<select id="reset-month">${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${state.policy.resetMonth===i+1?'selected':''}>${monthLabel('2026-'+String(i+1).padStart(2,'0')).replace(' 2569','')}</option>`).join('')}</select></label><button id="save-policy" style="margin-top:12px">บันทึกรอบปี</button><ul><li>ลาจริงหักสิทธิก่อน แล้วจึงแปลงสายสะสมทุก 6 ครั้งเป็นลา 1 วัน</li><li>ลาเกินสิทธิ 150 บาท/วัน หรือ 75 บาท/ครึ่งวัน</li><li>เมื่อสิทธิหมด สายใหม่คิด 25 บาท/ครั้ง และไม่สะสมซ้ำ</li><li>สายยกมาก่อนสิทธิหมดไม่คิดเงินย้อนหลัง เศษสายล้างเมื่อสิทธิหมด</li><li>สิทธิไม่ยกข้ามรอบปี รีเซ็ตเป็น 15 วันและสายเป็น 0 ในเดือนที่เลือก ยกเว้นเดือนเริ่มต้นที่ใช้ยอดนำเข้า</li><li>วันที่ในหน้ารายเดือนเป็นชื่อรอบสรุป ไม่จำกัดวันที่ลาแต่ละวัน</li></ul></div></section><div><section class="panel"><div class="panel-head"><h2>สำรองและกู้คืน</h2></div><div class="panel-body"><p>สำรองทุกสาขา ทุกรายเดือน และค่าตั้งต้นเป็น JSON</p><div class="actions"><button id="backup">↓ สำรองข้อมูล</button><button class="secondary" id="restore">กู้คืนจากไฟล์</button></div><p class="sub">กู้คืนจะแทนข้อมูลทั้งหมด ระบบเก็บสำเนาก่อนกู้คืนในโฟลเดอร์ data</p></div></section><section class="panel"><div class="panel-head"><h2>นำเข้ายอดตั้งต้น Excel</h2></div><div class="panel-body"><p>รองรับรูปแบบไฟล์เดิม: B ชื่อ, H วันลาคงเหลือ, I สายยกมา โดยชื่อชีตเป็นสาขา</p><label>เดือนเริ่มใช้ยอดนำเข้า<input type="month" id="import-start" value="${$('#month').value}"></label><button id="import" class="secondary" style="margin-top:12px">เลือกไฟล์ .xlsx และตรวจสอบ</button><p class="sub">แสดงตัวอย่างก่อนนำเข้า • ไม่เขียนทับพนักงานชื่อและสาขาซ้ำ</p></div></section></div></div><section class="panel"><div class="panel-head"><h2>ที่มาของข้อมูลเริ่มต้น</h2></div><div class="panel-body source-list">${state.source.map(s=>`<p><strong>${esc(s.sheet)}</strong> — ${esc(s.title)}</p>`).join('')}<p>ตัวเลขจากเดือนเดิมใช้เป็นยอดตั้งต้น ไม่บันทึกเป็นรายการเดือนสิงหาคมซ้ำ</p></div></section>`;
 $('#content').innerHTML=html;bind();bindSimplePages();document.querySelector('.admin-menu').open=['employees','settings'].includes(page);
}
function modal(title,fields,callback){$('#dialog-title').textContent=title;$('#fields').innerHTML=fields;$('#form-error').textContent='';editCallback=callback;$('#modal').showModal();}
const field=(label,name,value,type='text',extra='')=>`<label>${label}<input name="${name}" value="${esc(value)}" type="${type}" ${extra}></label>`;
function employee(id){const e=state.employees.find(e=>e.id===id)||{name:'',branch:state.branches[0],balance:15,carry:0,start:$('#month').value};modal(id?'แก้ไขพนักงานและยอดยกมา':'เพิ่มพนักงาน',field('ชื่อ–นามสกุล','name',e.name,'text','required maxlength="150"')+`<label>สาขา<select name="branch">${state.branches.map(b=>`<option ${e.branch===b?'selected':''}>${b}</option>`).join('')}</select></label>`+field('สิทธิคงเหลือตั้งต้น (วัน)','balance',e.balance,'number','min="0" max="15" step="0.5" required')+field('สายยกมา (ครั้ง)','carry',e.carry,'number','min="0" max="5" step="1" required')+field('เริ่มใช้ยอดเดือน','start',e.start,'month','min="2020-01" max="2099-12" required')+'<p class="sub wide">การแก้ยอดตั้งต้นจะคำนวณรายเดือนทั้งหมดใหม่ ตรวจสอบก่อนบันทึก</p>',async f=>{await api('/api/employee',{...f,id});});}
function record(id){const e=state.employees.find(e=>e.id===id),r=state.records.find(r=>r.employeeId===id&&r.month===$('#month').value)||{leave:0,late:0,note:''};modal('บันทึก '+e.name,`<p class="wide">${esc(e.branch)} · ${monthLabel($('#month').value)}</p>`+field('ลา (วัน) • ครึ่งวันใส่ 0.5','leave',r.leave,'number','min="0" max="31" step="0.5" required')+field('มาสาย (ครั้ง)','late',r.late,'number','min="0" max="100" step="1" required')+`<label class="wide">หมายเหตุ<textarea name="note" maxlength="1000">${esc(r.note)}</textarea></label>${r.employeeId?'<button type="button" id="delete-record" class="secondary wide">ลบบันทึกเดือนนี้</button>':''}`,async f=>{await api('/api/record',{...f,employeeId:id,month:$('#month').value});});$('#delete-record')?.addEventListener('click',async()=>{if(confirm('ลบบันทึกเดือนนี้? เดือนถัดไปจะคำนวณใหม่'))try{await api('/api/delete-record',{employeeId:id,month:$('#month').value});$('#modal').close();await load();notify('ลบบันทึกแล้ว');}catch(e){$('#form-error').textContent=e.message;}});}
function detail(id){const r=report.find(r=>r.employeeId===id);modal('รายละเอียด '+r.name,`<div class="wide help"><p>${monthLabel(r.month)} · ${esc(r.branch)}</p><p>สิทธิยกมา ${n(r.opening)} วัน / สายยกมา ${r.carryIn} ครั้ง</p><p>ลา ${n(r.leave)} วัน → ใช้สิทธิ ${n(r.paid)} / เกินสิทธิ ${n(r.unpaid)} วัน</p><p>สาย ${r.late} ครั้ง → แปลงลา ${r.converted} วัน / คิดเงิน ${r.chargedLate} ครั้ง</p><p>ค่าหักลา ${n(r.leaveFine)} + ค่าหักสาย ${n(r.lateFine)} = <strong>${n(r.total)} บาท</strong></p><p>สิทธิเหลือ ${n(r.balance)} วัน / สายสะสม ${r.carry} ครั้ง</p><p>หมายเหตุ: ${esc(r.note)||'—'}</p></div>`,async()=>{});}
function bind(){
 document.querySelectorAll('[data-record]').forEach(b=>b.onclick=()=>record(b.dataset.record));document.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>detail(b.dataset.detail));document.querySelectorAll('[data-employee]').forEach(b=>b.onclick=()=>employee(b.dataset.employee));
 document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=async()=>{if(confirm('ลบพนักงานคนนี้? ลบได้เฉพาะคนที่ยังไม่มีบันทึกรายเดือน'))try{await api('/api/delete-employee',{id:b.dataset.remove});await load();notify('ลบพนักงานแล้ว');}catch(e){notify(e.message,true);}});
 if($('#add-employee'))$('#add-employee').onclick=()=>employee();
 if($('#export'))$('#export').onclick=()=>exportXlsx().catch(e=>notify(e.message,true));
 if($('#print'))$('#print').onclick=printReport;
 if($('#save-policy'))$('#save-policy').onclick=async()=>{if(confirm('เปลี่ยนเดือนรีเซ็ตสิทธิ? รายงานทุกเดือนจะคำนวณใหม่ตามกติกานี้'))try{await api('/api/policy',{resetMonth:Number($('#reset-month').value)});await load();notify('บันทึกรอบปีแล้ว');}catch(e){notify(e.message,true);}};
 if($('#backup'))$('#backup').onclick=()=>download(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),'TRO-backup-'+new Date().toISOString().slice(0,10)+'.json');
 if($('#restore'))$('#restore').onclick=()=>choose('.json',async file=>{const s=JSON.parse(await file.text());if(confirm(`กู้คืน ${s.employees?.length||0} คน / ${s.records?.length||0} รายการ? ข้อมูลปัจจุบันจะถูกแทนที่`)){await api('/api/restore',{state:s});await load();notify('กู้คืนข้อมูลสำเร็จ');}});
 if($('#import'))$('#import').onclick=()=>choose('.xlsx',importXlsx);
}
function choose(accept,fn){const input=document.createElement('input');input.type='file';input.accept=accept;input.onchange=()=>{if(input.files[0])fn(input.files[0]).catch(e=>notify(e.message,true));};input.click();}
function download(blob,name){const a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),5000);}
$('#editor').onsubmit=async e=>{e.preventDefault();const b=$('#editor button[type="submit"]')||$('#editor .dialog-actions button:last-child');b.disabled=true;try{await editCallback(Object.fromEntries(new FormData(e.target)));$('#modal').close();await load();notify('บันทึกข้อมูลเรียบร้อย');}catch(err){$('#form-error').textContent=err.message;}finally{b.disabled=false;}};
$('#close').onclick=$('#cancel').onclick=()=>$('#modal').close();$('#month').onchange=guardedRefresh;$('#branch').onchange=$('#search').oninput=guardedFilter;window.onhashchange=guardedNavigation;
function login(){if($('#modal').open)$('#modal').close();modal('เข้าสู่ระบบ SMS SOFUTO',field('รหัสผ่านผู้ดูแล','password','','password','required autocomplete="current-password"'),async f=>{await api('/api/login',f);});}
const xml=(s)=>new DOMParser().parseFromString(s,'application/xml');
async function importXlsx(file){
 if(file.size>10e6)throw Error('ไฟล์ต้องมีขนาดไม่เกิน 10 MB');
 const z=await JSZip.loadAsync(file),read=async p=>{const f=z.file(p);if(!f)throw Error('ไม่พบ '+p);const s=await f.async('string');if(s.length>5e6)throw Error('ตารางใหญ่เกินไป');return xml(s);};
 const shared=z.file('xl/sharedStrings.xml')?[...(await read('xl/sharedStrings.xml')).getElementsByTagName('si')].map(x=>[...x.getElementsByTagName('t')].map(t=>t.textContent).join('')):[];
 const wb=await read('xl/workbook.xml'),rels=await read('xl/_rels/workbook.xml.rels'),es=[];let ignored=[];
 for(const sheet of wb.getElementsByTagName('sheet')){
  const rawBranch=sheet.getAttribute('name').trim(),branch=rawBranch==='โพธิ์ชัย'?'โพธิชัย':rawBranch;if(!state.branches.includes(branch)){ignored.push(branch);continue;}
  const rid=sheet.getAttribute('r:id'),rel=[...rels.getElementsByTagName('Relationship')].find(r=>r.getAttribute('Id')===rid);if(!rel)throw Error('โครงสร้างชีตไม่ถูกต้อง');
  let target=rel.getAttribute('Target');target=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'');
  const doc=await read(target);
  for(const row of doc.getElementsByTagName('row')){
   const cells={};for(const c of row.getElementsByTagName('c')){const col=c.getAttribute('r').replace(/\d/g,''),v=c.getElementsByTagName('v')[0]?.textContent??c.getElementsByTagName('t')[0]?.textContent??'';cells[col]=c.getAttribute('t')==='s'?shared[Number(v)]:v;}
   if(!cells.B?.trim()||!/^\d+$/.test(cells.A))continue;
   const balance=Number(cells.H),carry=Number(cells.I||0);
   if(cells.H===''||cells.H===undefined||!Number.isFinite(balance)||balance<0||balance>15||balance*2%1||!Number.isInteger(carry)||carry<0||carry>5)throw Error(`ยอดตั้งต้นไม่ถูกต้อง: ${cells.B}`);
   es.push({name:cells.B.trim(),branch,balance,carry,start:$('#import-start').value});
  }
 }
 if(!es.length)throw Error('ไม่พบข้อมูลรูปแบบเดิมใน 5 สาขา');
 modal('ตรวจสอบก่อนนำเข้า',`<div class="wide help"><p>พบ ${es.length} คน • เดือนเริ่ม ${monthLabel($('#import-start').value)}</p><div style="max-height:300px;overflow:auto">${es.map(e=>`<p>${esc(e.name)} · ${e.branch}<br>สิทธิเหลือ ${e.balance} วัน / สาย ${e.carry} ครั้ง</p>`).join('')}</div>${ignored.length?`<p>ข้ามชีต: ${ignored.map(esc).join(', ')}</p>`:''}<p>ชื่อและสาขาซ้ำจะไม่ถูกนำเข้า กรุณาแก้ยอดผ่านหน้าพนักงาน</p></div>`,async()=>{await api('/api/import',{employees:es});});
}
function xcell(v){return typeof v==='number'?`<c><v>${v}</v></c>`:`<c t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;}
async function exportXlsx(){
 if(report.some(r=>r.archive)){const a=document.createElement('a');a.href='/api/source';a.download='August-2569-original.xlsx';a.click();return;}
 const rows=filtered(report),headers=['พนักงาน','สาขา','เดือน','สิทธิยกมา','สายยกมา','ลา (วัน)','สาย (ครั้ง)','ใช้สิทธิลา','ลาเกินสิทธิ','สายแปลงลา','สิทธิคงเหลือ','สายสะสม','หักลา (บาท)','สายคิดเงิน (ครั้ง)','หักสาย (บาท)','รวม (บาท)','สถานะ','หมายเหตุ'];
 const values=rr=>[headers,...rr.map(r=>[r.name,r.branch,monthLabel(r.month),r.opening,r.carryIn,r.leave,r.late,r.paid,r.unpaid,r.converted,r.balance,r.carry,r.leaveFine,r.chargedLate,r.lateFine,r.total,r.saved?'บันทึกแล้ว':'ยังไม่บันทึก',r.note]),['รวม','','',...Array.from({length:13},(_,i)=>rr.reduce((s,r)=>s+Number([r.opening,r.carryIn,r.leave,r.late,r.paid,r.unpaid,r.converted,r.balance,r.carry,r.leaveFine,r.chargedLate,r.lateFine,r.total][i]),0))]];
 const sheets=[{name:'รวม',rows:values(rows)},{name:'สรุปสาขา',rows:[['สาขา','พนักงาน','ลา (วัน)','สาย (ครั้ง)','ลาเกินสิทธิ','สายแปลงลา','หักเงิน (บาท)'],...state.branches.filter(b=>!$('#branch').value||$('#branch').value===b).map(b=>{const rr=rows.filter(r=>r.branch===b),t=totals(rr);return [b,rr.length,t.leave,t.late,t.unpaid,t.converted,t.total];}),['รวม',rows.length,...['leave','late','unpaid','converted','total'].map(k=>totals(rows)[k])]]},...state.branches.filter(b=>!$('#branch').value||$('#branch').value===b).map(b=>({name:b,rows:values(rows.filter(r=>r.branch===b))}))];
 const z=new JSZip();const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 z.file('[Content_Types].xml',`<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);
 z.file('_rels/.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
 z.file('xl/workbook.xml',`<?xml version="1.0"?><workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${s.name}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`);
 z.file('xl/_rels/workbook.xml.rels',`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}</Relationships>`);
 sheets.forEach((s,i)=>z.file(`xl/worksheets/sheet${i+1}.xml`,`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="${ns}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="38" customWidth="1"/><col min="2" max="18" width="19" customWidth="1"/></cols><sheetData>${s.rows.map((r,j)=>`<row r="${j+1}">${r.map(xcell).join('')}</row>`).join('')}</sheetData><autoFilter ref="A1:${i===1?'G':'R'}${s.rows.length-1}"/></worksheet>`));
 download(await z.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',compression:'DEFLATE'}),`TRO-${$('#month').value}-${$('#branch').value||'ทุกสาขา'}.xlsx`);notify('ส่งออก Excel เรียบร้อย');
}
let dirtyMonthly=false,filterState={},signers={prepared:'',checked:'',approved:''},pdfLayout='branches',monthSaving=false;
function rememberFilters(){filterState={month:$('#month').value,branch:$('#branch').value,search:$('#search').value};}
function confirmDiscard(){return !monthSaving&&(!dirtyMonthly||confirm('มีข้อมูลที่ยังไม่บันทึก ต้องการออกจากหน้านี้หรือเปลี่ยนตัวกรองโดยไม่บันทึกหรือไม่?'));}
function restoreFilters(){for(const key of ['month','branch','search'])$('#'+key).value=filterState[key]??'';}
function guardedRefresh(){if(!confirmDiscard()){restoreFilters();return;}dirtyMonthly=false;refresh();}
function guardedFilter(){if(!confirmDiscard()){restoreFilters();return;}dirtyMonthly=false;if(state)render();}
function guardedNavigation(){if(!confirmDiscard()){history.replaceState(null,'','#'+page);return;}dirtyMonthly=false;if(state)render();}
window.addEventListener('beforeunload',e=>{if(dirtyMonthly||monthSaving){e.preventDefault();e.returnValue='';}});
function overviewIntro(rows){return `<div class="quick-start"><div><span class="step-label">01 · ภาพรวม</span><h2>${esc($('#branch').value||'รวมทุกสาขา')} · ${monthLabel($('#month').value)}</h2><p>เลือกเดือนและสาขาด้านบน เพื่อดูยอดลา สาย และยอดหัก</p></div><div class="actions"><a class="button" href="#monthly">+ เพิ่มข้อมูลเดือนนี้</a><a class="button secondary" href="#reports">ดูสรุป PDF</a></div></div><div class="branch-tabs" aria-label="เลือกสาขา">${['',...state.branches].map(b=>`<button type="button" class="${$('#branch').value===b?'selected':''}" data-branch="${esc(b)}" aria-pressed="${$('#branch').value===b}">${b||'ทั้งหมด'}</button>`).join('')}</div>`;}
function branchSummary(rows){const groups=state.branches.filter(b=>!$('#branch').value||b===$('#branch').value);return `<div class="table-wrap branch-summary"><table><caption>สรุปแต่ละสาขา · ${monthLabel($('#month').value)}</caption><thead><tr><th>สาขา</th><th>พนักงาน</th><th>ลา (วัน)</th><th>สาย (ครั้ง)</th><th>ยอดหัก (บาท)</th><th>บันทึกแล้ว</th></tr></thead><tbody>${groups.map(b=>{const rr=rows.filter(r=>r.branch===b),t=totals(rr);return `<tr><td>${b}</td><td>${rr.length}</td><td>${n(t.leave)}</td><td>${n(t.late)}</td><td class="money">${n(t.total)}</td><td>${rr.filter(r=>r.saved).length} / ${rr.length} คน</td></tr>`;}).join('')}<tr class="total-row"><td>รวมทั้งหมด</td><td>${rows.length}</td><td>${n(totals(rows).leave)}</td><td>${n(totals(rows).late)}</td><td>${n(totals(rows).total)}</td><td>${rows.filter(r=>r.saved).length} / ${rows.length} คน</td></tr></tbody></table></div>`;}
function monthlyEntry(rows){return `<div class="quick-start"><div><span class="step-label">02 · เพิ่มข้อมูล</span><h2>${monthLabel($('#month').value)} · ${esc($('#branch').value||'ทุกสาขา')}</h2><p>กรอกในตารางได้เลย • ลาครึ่งวันใส่ 0.5 • ถ้าไม่มีลาและสายให้ใส่ 0</p></div><button id="new-month" class="secondary">+ เลือกเดือนใหม่</button></div><form id="monthly-form" class="panel"><div class="panel-head"><div><h2>กรอกข้อมูลประจำเดือน</h2><p>บันทึกแล้ว ${rows.filter(r=>r.saved).length} / ${rows.length} คน · บันทึกเฉพาะพนักงานที่แสดงในตาราง</p></div><button id="save-month" ${rows.length?'':'disabled'}>บันทึกข้อมูล ${rows.length} คน</button></div><div class="table-wrap"><table class="entry-table"><thead><tr><th>พนักงาน / สาขา</th><th>สิทธิคงเหลือก่อนเดือนนี้</th><th>ลา (วัน)</th><th>สาย (ครั้ง)</th><th>หมายเหตุ</th><th>สถานะ</th></tr></thead><tbody>${rows.map(r=>`<tr data-entry="${esc(r.employeeId)}"><td><span class="person">${esc(r.name)}</span><span class="sub">${esc(r.branch)}</span></td><td>${n(r.opening)} วัน</td><td><input data-field="leave" aria-label="ลา (วัน) ${esc(r.name)}" type="number" min="0" max="31" step="0.5" value="${r.leave}" required></td><td><input data-field="late" aria-label="สาย (ครั้ง) ${esc(r.name)}" type="number" min="0" max="100" step="1" value="${r.late}" required></td><td><input data-field="note" aria-label="หมายเหตุ ${esc(r.name)}" maxlength="1000" value="${esc(r.note)}" placeholder="ระบุได้ถ้ามี"></td><td><span class="badge ${r.saved?'':'warn'}">${r.saved?'บันทึกแล้ว':'ยังไม่บันทึก'}</span>${r.saved?`<button type="button" class="plain" data-record="${esc(r.employeeId)}">รายละเอียด / ลบ</button>`:''}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">ไม่พบพนักงานในเดือนหรือเงื่อนไขนี้ ลองเลือกเดือนหลังยอดตั้งต้น</td></tr>'}</tbody></table></div><div class="entry-footer"><span id="draft-status" role="status">แก้ข้อมูลแล้วกดบันทึก ระบบจะคำนวณสิทธิและยอดหักใหม่ให้</span><span>รอบวันที่ 26 เดือนก่อน–25 เดือนนี้</span></div></form>`;}
function reportScreen(rows){return `<div class="quick-start no-print"><div><span class="step-label">03 · สรุปและลงนาม</span><h2>${monthLabel($('#month').value)} · ${esc($('#branch').value||'ทุกสาขา')}</h2><p>เลือกสาขาด้านบน หรือเลือกทั้งหมดเพื่อรวมทุกสาขาในไฟล์เดียว</p></div><div class="actions"><button id="download-pdf">ดาวน์โหลด PDF</button><button id="print" class="secondary">พิมพ์เอกสาร</button><button id="export" class="secondary">${rows.some(r=>r.archive)?'Excel ต้นฉบับ (ทุกสาขา)':'ส่งออก Excel'}</button></div></div><section class="panel no-print"><div class="panel-body report-options"><label>รูปแบบเอกสาร<select id="pdf-layout"><option value="branches" ${pdfLayout==='branches'?'selected':''}>แยกหน้าแต่ละสาขา</option><option value="combined" ${pdfLayout==='combined'?'selected':''}>รวมทุกสาขาในตารางเดียว</option></select></label></div></section><div class="info no-print">กด “ดาวน์โหลด PDF” เพื่อรับไฟล์ทันที • กระดาษ A4 แนวนอน • มีช่องลงชื่อรับทราบของพนักงาน</div><div id="report-preview">${buildPrintPages(rows)}</div>`;}
function sumField(rows,key){return rows.reduce((s,r)=>s+Number(r[key]||0),0);}
function summaryRows(rows){return rows.map(r=>{
 if(r.archive)return r;
 const employee=state.employees.find(e=>e.id===r.employeeId);
 const initial=state.archives?.['2026-08']?.find(e=>e.employeeId===r.employeeId);
 let used=employee?.start==='2026-09'&&initial?initial.sourceUsed:null;
 for(const h of r.history||[]){
  if(h.month!==employee?.start&&Number(h.month.slice(5))===(state.policy?.resetMonth||1))used=0;
  if(h.month===r.month)return {...r,previousLeave:used,previousLate:h.carryIn,sourceUsed:r.saved&&used!==null?used+r.leave+r.converted:null,leave:r.saved?r.leave:null,late:r.saved?r.late:null};
  if(used!==null)used+=h.leave+h.converted;
 }
 return {...r,previousLeave:null,previousLate:r.carryIn,sourceUsed:null};
});}
function buildPrintPages(rows){return archivePrintPages(summaryRows(rows));}
function printReport(){if(!filtered(report).length){notify('ไม่มีพนักงานให้พิมพ์ กรุณาเปลี่ยนเดือนหรือสาขา',true);return;}document.title=`TRO-${$('#month').value}-${$('#branch').value||'ทุกสาขา'}`;window.print();}
function bindSimplePages(){
 document.querySelectorAll('[data-history-month]').forEach(b=>b.onclick=()=>{if(!confirmDiscard())return;dirtyMonthly=false;$('#month').value=b.dataset.historyMonth;$('#search').value='';refresh();});
 if($('#download-pdf'))$('#download-pdf').onclick=downloadPdf;
 document.querySelectorAll('[data-record]').forEach(b=>b.onclick=()=>{if(!confirmDiscard())return;dirtyMonthly=false;record(b.dataset.record);});
 rememberFilters();
 document.querySelectorAll('[data-branch]').forEach(b=>b.onclick=()=>{$('#branch').value=b.dataset.branch;render();});
 if($('#new-month'))$('#new-month').onclick=()=>{if(!confirmDiscard())return;modal('เลือกเดือนและสาขาที่จะเพิ่มข้อมูล',field('เดือนที่ต้องการบันทึก','month',$('#month').value,'month','min="2020-01" max="2099-12" required')+`<label>สาขา<select name="branch"><option value="">ทุกสาขา</option>${state.branches.map(b=>`<option ${$('#branch').value===b?'selected':''}>${esc(b)}</option>`).join('')}</select></label>`,async f=>{dirtyMonthly=false;$('#month').value=f.month;$('#branch').value=f.branch;$('#search').value='';});};
 const form=$('#monthly-form');if(form){form.oninput=()=>{dirtyMonthly=true;$('#draft-status').textContent='มีการแก้ไขที่ยังไม่บันทึก';};form.onsubmit=async e=>{e.preventDefault();if(!form.reportValidity()||monthSaving)return;const month=$('#month').value,records=[...document.querySelectorAll('[data-entry]')].map(tr=>({employeeId:tr.dataset.entry,month,leave:Number(tr.querySelector('[data-field="leave"]').value),late:Number(tr.querySelector('[data-field="late"]').value),note:tr.querySelector('[data-field="note"]').value}));monthSaving=true;const btn=$('#save-month');btn.disabled=true;btn.textContent='กำลังบันทึก…';try{await api('/api/records',{records});dirtyMonthly=false;await load();notify(`บันทึก${monthLabel(month)} สำเร็จ ${records.length} คน`);}catch(err){notify(err.message,true);btn.disabled=false;btn.textContent='บันทึกอีกครั้ง';}finally{monthSaving=false;}};}
 if($('#pdf-layout'))$('#pdf-layout').onchange=e=>{pdfLayout=e.target.value;$('#report-preview').innerHTML=buildPrintPages(filtered(report));};
 for(const key of ['prepared','checked','approved'])if($('#sign-'+key))$('#sign-'+key).oninput=e=>{signers[key]=e.target.value;$('#report-preview').innerHTML=buildPrintPages(filtered(report));};
}

function pdfChunks(rows){
 const groups=pdfLayout==='branches'?state.branches.filter(b=>!$('#branch').value||b===$('#branch').value).map(branch=>({title:'สาขา'+branch,rows:rows.filter(r=>r.branch===branch)})):[{title:$('#branch').value?'สาขา'+$('#branch').value:'รวมทุกสาขา',rows}];
 const pages=[];for(const group of groups)for(let i=0;i<Math.max(1,Math.ceil(group.rows.length/6));i++)pages.push({...group,pageRows:group.rows.slice(i*6,i*6+6),offset:i*6});return pages;
}
function deductionNotes(rows){
 const lines=rows.filter(r=>r.saved&&r.total>0).map(r=>{
  const reasons=[];
  if(r.leaveFine>0)reasons.push('ลาเกินสิทธิ '+n(r.unpaid)+' วัน');
  if(r.lateFine>0)reasons.push('สาย '+n(r.chargedLate)+' ครั้ง');
  return r.name+': '+reasons.join(', ')+' หัก '+n(r.total)+' บาท';
 });
 if(rows.some(r=>!r.saved))lines.push('ฉบับร่าง: ยังบันทึกข้อมูลไม่ครบ');
 return lines;
}
function deductionNotesHtml(rows){const lines=deductionNotes(rows);return lines.length?'<section class="deduction-notes"><strong>หมายเหตุ</strong>'+lines.map(t=>'<div>'+esc(t)+'</div>').join('')+'</section>':'';}
function deductionNotesPdf(rows){const lines=deductionNotes(rows);return lines.length?{stack:[{text:'หมายเหตุ',bold:true},...lines.map(text=>({text,margin:[0,3,0,0]}))],fontSize:10,margin:[0,10,0,0]}:{text:''};}
function buildPdfDefinition(rows){return buildArchivePdfDefinition(summaryRows(rows));}
async function downloadPdf(){
 const rows=filtered(report);if(!rows.length){notify('ไม่มีพนักงานในเงื่อนไขนี้',true);return;}
 const btn=$('#download-pdf');btn.disabled=true;btn.textContent='กำลังสร้าง PDF…';
 try{const definition=buildPdfDefinition(rows);const blob=await new Promise((resolve,reject)=>{try{pdfMake.createPdf(definition).getBlob(resolve);}catch(e){reject(e);}});download(blob,`TRO-${$('#month').value}-${$('#branch').value||'ทุกสาขา'}.pdf`);notify('สร้างไฟล์ PDF พร้อมช่องลายเซ็นแล้ว');}catch(e){notify('สร้าง PDF ไม่สำเร็จ: '+e.message,true);}finally{btn.disabled=false;btn.textContent='ดาวน์โหลด PDF';}
}

const hidePrevious=(r,key)=>['previousLeave','previousLate'].includes(key)&&r.saved&&(Number(r.unpaid)>0||Number(r.leaveFine)>0);
const summaryValue=(r,key)=>hidePrevious(r,key)?'':sourceN(r[key]);
const summaryTotal=(rows,key)=>{const shown=rows.filter(r=>!hidePrevious(r,key));return !shown.length?'':shown.some(r=>r[key]===null||r[key]===undefined)?'—':n(sumField(shown,key));};
const sourceN=v=>v===null||v===undefined?'—':n(v);
function archiveNotice(){return '<div class="info no-print">ประวัติจากไฟล์สิงหาคม2569.xlsx • แสดงเดือนก่อนและเดือนปัจจุบันตามต้นฉบับ • บางชีตยังใช้หัวรายงานเดือนกรกฎาคม จึงเก็บหัวเดิมกำกับไว้ • ตัวเลขนี้ไม่ถูกนำไปหักยอดกันยายนซ้ำ ค่าหักเงินที่ยืนยันเพิ่มเติมแสดงในหมายเหตุรายงาน</div>';}
function archiveTable(rows,signature=false){return `<div class="table-wrap"><table class="archive-table"><thead><tr><th rowspan="2">พนักงาน / สาขา</th><th colspan="2" class="previous-group">เดือนก่อน</th><th colspan="2" class="current-group">${esc(monthLabel($('#month').value))}</th><th colspan="3">สรุปยอดสิ้นเดือน</th>${signature?'<th rowspan="2" class="ack-column">ลงชื่อรับทราบ</th>':''}</tr><tr><th class="previous-group">ลาสะสม (วัน)</th><th class="previous-group">สายสะสม (ครั้ง)</th><th class="current-group">ลา (วัน)</th><th class="current-group">สาย (ครั้ง)</th><th>ลาทั้งหมด (วัน)</th><th>วันลาที่เหลือ</th><th>สายยกไป (ครั้ง)</th></tr></thead><tbody>${rows.map(r=>`<tr><td><span class="person">${esc(r.name)}</span><span class="sub">${esc(r.branch)}</span></td>${['previousLeave','previousLate','leave','late','sourceUsed','balance','carry'].map(k=>`<td class="numeric ${k==='leave'||k==='late'?'current-group':''}">${summaryValue(r,k)}</td>`).join('')}${signature?'<td><span class="employee-sign"></span></td>':''}</tr>`).join('')||`<tr><td colspan="${signature?9:8}" class="empty">ไม่พบพนักงานตามเงื่อนไข</td></tr>`}</tbody></table></div>`;}
function archiveView(rows){
 const head=`${archiveNotice()}<div class="quick-start no-print"><div><span class="step-label">ประวัติจากไฟล์ต้นฉบับ</span><h2>สิงหาคม 2569 · ${esc($('#branch').value||'ทุกสาขา')}</h2><p>ดูย้อนหลังได้ทั้งยอดเดือนก่อนและรายการเดือนปัจจุบัน</p></div><div class="actions"><button class="secondary" data-history-month="2026-09">ไปเพิ่มข้อมูลกันยายน</button><a class="button secondary" href="/api/source" download>ดาวน์โหลด Excel ต้นฉบับ</a></div></div>`;
 if(page==='reports')return head+reportScreen(rows);
 return head+`<div class="cards"><div class="card featured"><div class="card-label">พนักงานในประวัติ</div><div class="metric">${rows.length}<small>คน</small></div></div><div class="card"><div class="card-label">ลาเดือนสิงหาคม</div><div class="metric">${n(sumField(rows,'leave'))}<small>วัน</small></div></div><div class="card"><div class="card-label">สายเดือนสิงหาคม</div><div class="metric">${n(sumField(rows,'late'))}<small>ครั้ง</small></div></div><div class="card"><div class="card-label">สิทธิคงเหลือรวมปลายเดือน</div><div class="metric">${n(sumField(rows,'balance'))}<small>วัน</small></div></div></div><section class="panel"><div class="panel-head"><div><h2>เดือนก่อน / เดือนปัจจุบันของสิงหาคม</h2><p>ประวัติแบบอ่านอย่างเดียวตามไฟล์เดิม ไม่ใช่รายการบันทึกใหม่</p></div><a class="button" href="#reports">ดูสรุป PDF</a></div>${archiveTable(rows)}<div class="panel-body source-list">${[...new Set(rows.map(r=>r.sourceTitle))].map(t=>`<p>หัวรายงานต้นฉบับ: ${esc(t)}</p>`).join('')}</div></section>`;
}
function archivePrintPages(rows){return pdfChunks(rows).map(g=>`<article class="print-sheet"><h2>สรุปการลาและมาสาย · ${esc(monthLabel($('#month').value))}</h2><div class="document-meta"><strong>${esc(g.title)}</strong></div>${archiveTable(g.pageRows,true)}${deductionNotesHtml(g.pageRows)}</article>`).join('');}
function buildArchivePdfDefinition(rows){
 const pages=pdfChunks(rows),content=[];
 const c=(text,extra={})=>({text:String(text??''),fontSize:11,noWrap:!String(text??'').includes('\n'),margin:[0,6,0,6],...extra});
 for(const [index,g] of pages.entries()){
  const body=[
   [c('ชื่อ–นามสกุล',{rowSpan:2,bold:true}),c('สาขา',{rowSpan:2,bold:true}),c('เดือนก่อน',{colSpan:2,bold:true,alignment:'center'}),{},c(monthLabel($('#month').value),{colSpan:2,bold:true,alignment:'center'}),{},c('สรุปยอดสิ้นเดือน',{colSpan:3,bold:true,alignment:'center'}),{}, {},c('ลงชื่อรับทราบ',{rowSpan:2,bold:true,fontSize:10,alignment:'center'})],
   [{},{},c('ลาสะสม\n(วัน)'),c('สายสะสม\n(ครั้ง)'),c('ลา\n(วัน)'),c('สาย\n(ครั้ง)'),c('ลาทั้งหมด\n(วัน)'),c('วันลา\nที่เหลือ'),c('สายยกไป\n(ครั้ง)'),{}],
   ...g.pageRows.map(r=>[c(r.name),c(r.branch),...['previousLeave','previousLate','leave','late','sourceUsed','balance','carry'].map(k=>c(summaryValue(r,k),{alignment:'right'})),c('........................')]),
  ];
  content.push({pageBreak:index?'before':undefined,stack:[
   {text:'สรุปการลาและมาสาย · '+monthLabel($('#month').value),bold:true,fontSize:17,alignment:'center',margin:[0,16,0,10]},
   {text:g.title,bold:true,margin:[0,0,0,10]},
   {table:{headerRows:2,widths:['*',45,58,58,48,48,58,58,58,95],body,dontBreakRows:true},layout:{fillColor:i=>i<2?'#edf3ee':null,hLineColor:()=> '#b7c5ba',vLineColor:()=> '#b7c5ba',hLineWidth:()=>.5,vLineWidth:()=>.5}},
   deductionNotesPdf(g.pageRows),
  ]});
 }
 return {pageSize:'A4',pageOrientation:'landscape',pageMargins:[28,25,28,25],defaultStyle:{font:'NotoThai',fontSize:10},info:{title:'TRO '+monthLabel($('#month').value)},content};
}

load().catch(e=>notify(e.message,true));

// Theme preference is local to this browser and does not alter attendance data.
const themeButton=document.querySelector('#theme-toggle');
function syncThemeButton(){
 const dark=document.documentElement.dataset.theme==='dark';
 themeButton.setAttribute('aria-pressed',String(dark));
 themeButton.setAttribute('aria-label',dark?'เปลี่ยนเป็นโหมดสว่าง':'เปลี่ยนเป็นโหมดมืด');
 document.querySelector('#theme-label').textContent=dark?'โหมดสว่าง':'โหมดมืด';
 document.querySelector('#theme-icon').textContent=dark?'☀':'◐';
}
if(themeButton){syncThemeButton();themeButton.addEventListener('click',()=>{
 const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';
 document.documentElement.dataset.theme=theme;
 try{localStorage.setItem('sms-theme',theme)}catch(e){}
 syncThemeButton();
});matchMedia('(prefers-color-scheme: dark)').addEventListener('change',e=>{
 try{if(localStorage.getItem('sms-theme'))return}catch(error){}
 document.documentElement.dataset.theme=e.matches?'dark':'light';syncThemeButton();
});}

const logoutButton=document.querySelector('#logout');
if(logoutButton)logoutButton.addEventListener('click',async()=>{
 if(!confirmDiscard())return;
 try{await api('/api/logout',{});location.reload();}catch(e){notify(e.message,true);}
});
const sidebarToggle=document.querySelector('#sidebar-toggle');
if(sidebarToggle){
 const root=document.documentElement,groups=[...document.querySelectorAll('#sidebar details')];
 const mobileSidebar=matchMedia('(max-width:760px)');
 const drawer=document.querySelector('#sidebar-drawer');
 let previousOpen;
 const applySidebar=()=>{
  const collapsed=root.dataset.sidebar==='collapsed';
  if(collapsed&&!previousOpen){previousOpen=groups.map(g=>g.open);groups.forEach(g=>g.open=true);}
  if(drawer)drawer.inert=collapsed&&mobileSidebar.matches;
  if(!collapsed&&previousOpen){groups.forEach((g,i)=>g.open=previousOpen[i]);previousOpen=null;}
  sidebarToggle.setAttribute('aria-expanded',String(!collapsed));
  sidebarToggle.setAttribute('aria-label',collapsed?'ขยายเมนู':'ยุบเมนู');
  sidebarToggle.title=collapsed?'ขยายเมนู':'ยุบเมนู';
 };
 document.querySelectorAll('#sidebar nav a').forEach(a=>{const label=a.querySelector('span')?.textContent||'';a.title=label;a.setAttribute('aria-label',label);});
 sidebarToggle.addEventListener('click',()=>{
  root.dataset.sidebar=root.dataset.sidebar==='collapsed'?'expanded':'collapsed';
  try{localStorage.setItem('sms-sidebar',root.dataset.sidebar)}catch(e){}
  applySidebar();
 });
 mobileSidebar.addEventListener('change',()=>{if(drawer)drawer.inert=root.dataset.sidebar==='collapsed'&&mobileSidebar.matches;});
 applySidebar();
}
