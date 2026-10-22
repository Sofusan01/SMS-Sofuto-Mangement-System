from pathlib import Path
p=Path('public/app.js');s=p.read_text(encoding='utf-8')
helper='''function deductionNotes(rows){
 if(rows.some(r=>r.archive))return ['ข้อมูลสิงหาคมไม่มีค่าหักเงินที่ยืนยันในต้นฉบับ จึงยังระบุผู้ถูกหักและยอดหักไม่ได้'];
 const charged=rows.filter(r=>r.saved&&r.total>0);
 const lines=charged.map(r=>{
  const reasons=[];
  if(r.leaveFine>0)reasons.push('ลา/สายแปลงลาเกินสิทธิ '+n(r.unpaid)+' วัน × 150 = '+n(r.leaveFine)+' บาท');
  if(r.lateFine>0)reasons.push('สายเมื่อสิทธิหมด '+n(r.chargedLate)+' ครั้ง × 25 = '+n(r.lateFine)+' บาท');
  return r.name+' · '+r.branch+' — '+reasons.join(' · ')+' · รวม '+n(r.total)+' บาท'+(r.note?' · หมายเหตุ: '+r.note:'');
 });
 if(!charged.length)lines.push('ไม่มีรายการหักเงินในข้อมูลที่บันทึกแล้วของหน้านี้');
 if(rows.some(r=>!r.saved))lines.push('ยังมีพนักงานที่ไม่ได้บันทึกข้อมูล จึงยังสรุปยอดหักของเดือนนี้ได้ไม่ครบ');
 return lines;
}
function deductionNotesHtml(rows){return '<section class="deduction-notes"><strong>หมายเหตุการหักเงิน</strong>'+deductionNotes(rows).map(t=>'<div>'+esc(t)+'</div>').join('')+'</section>';}
function deductionNotesPdf(rows){return {stack:[{text:'หมายเหตุการหักเงิน',bold:true,margin:[0,0,0,4]},...deductionNotes(rows).map(text=>({text,margin:[0,0,0,3]}))],fontSize:9,margin:[0,10,0,8]};}
'''
s=s.replace('function buildPdfDefinition(rows){',helper+'\nfunction buildPdfDefinition(rows){')
s=s.replace('</strong></div><div class="signature-grid">','</strong></div>${deductionNotesHtml(rr)}<div class="signature-grid">')
s=s.replace('${archiveTable(g.pageRows,true)}</article>','${archiveTable(g.pageRows,true)}${deductionNotesHtml(g.pageRows)}</article>')
s=s.replace("   {text:'รวม'+group.title", "   deductionNotesPdf(rr),\n   {text:'รวม'+group.title")
start=s.index('function buildArchivePdfDefinition')
part=s[start:];part=part.replace('  ]});','   deductionNotesPdf(g.pageRows),\n  ]});',1);s=s[:start]+part
p.write_text(s,encoding='utf-8')
