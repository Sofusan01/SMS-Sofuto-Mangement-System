from pathlib import Path
p=Path('public/app.js');s=p.read_text(encoding='utf-8')
a=s.index('function buildPrintPages(');b=s.index('function printReport',a)
s=s[:a]+'''function summaryRows(rows){return rows.map(r=>{
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
'''+s[b:]
a=s.index('function deductionNotes(rows)');b=s.index('async function downloadPdf',a)
s=s[:a]+'''function deductionNotes(rows){
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
'''+s[b:]
s=s.replace('เดือนก่อนสิงหาคม</th>','เดือนก่อน</th>').replace('เดือนปัจจุบัน · สิงหาคม 2569</th>','${esc(monthLabel($(\'#month\').value))}</th>')
s=s.replace('ประวัติการลาและมาสาย · สิงหาคม 2569</h2>','สรุปการลาและมาสาย · ${esc(monthLabel($(\'#month\').value))}</h2>')
s=s.replace("c('เดือนก่อนสิงหาคม'","c('เดือนก่อน'").replace("c('สิงหาคม 2569'","c(monthLabel($('#month').value)")
s=s.replace("text:'ประวัติการลาและมาสาย · สิงหาคม 2569'","text:'สรุปการลาและมาสาย · '+monthLabel($('#month').value)")
s=s.replace("title:'TRO ประวัติสิงหาคม 2569'","title:'TRO '+monthLabel($('#month').value)")
# Remove obsolete approver controls from the report options only.
a=s.index('function reportScreen(');b=s.index('function sumField',a)
t=s[a:b]
import re
t=re.sub(r'<label>ชื่อผู้(?:จัดทำ|ตรวจสอบ|อนุมัติ)<input.*?</label>','',t)
t=t.replace('มีช่องลายเซ็นพนักงานและผู้รับรองทุกหน้า','มีช่องลงชื่อรับทราบของพนักงาน')
s=s[:a]+t+s[b:]
p.write_text(s,encoding='utf-8')
