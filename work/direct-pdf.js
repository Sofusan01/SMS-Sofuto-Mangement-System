function pdfChunks(rows){
 const groups=pdfLayout==='branches'?state.branches.filter(b=>!$('#branch').value||b===$('#branch').value).map(branch=>({title:'สาขา'+branch,rows:rows.filter(r=>r.branch===branch)})):[{title:$('#branch').value?'สาขา'+$('#branch').value:'รวมทุกสาขา',rows}];
 const pages=[];for(const group of groups)for(let i=0;i<Math.max(1,Math.ceil(group.rows.length/10));i++)pages.push({...group,pageRows:group.rows.slice(i*10,i*10+10),offset:i*10});return pages;
}
function buildPdfDefinition(rows){
 const content=[];const pages=pdfChunks(rows);
 const cell=(text,opts={})=>({text:String(text??''),fontSize:8.5,margin:[2,5,2,5],...opts});
 for(const [pageIndex,group] of pages.entries()){
  const rr=group.pageRows,missing=group.rows.filter(r=>!r.saved).length;
  const head=['ลำดับ','ชื่อ–นามสกุล','สาขา','ลา\n(วัน)','สาย\n(ครั้ง)','สาย\nเป็นลา','สิทธิ\nคงเหลือ','หักลา\n(บาท)','หักสาย\n(บาท)','รวมหัก\n(บาท)','ลายเซ็นพนักงาน'].map(t=>cell(t,{bold:true,alignment:'center',fillColor:'#eaf1ec'}));
  const body=[head,...rr.map((r,i)=>[cell(group.offset+i+1,{alignment:'center'}),cell(r.name+(!r.saved?'\n(ยังไม่บันทึก)':'')),cell(r.branch),...['leave','late','converted','balance','leaveFine','lateFine','total'].map((key,index)=>cell(!r.saved&&index<2?'—':n(r[key]),{alignment:'right'})),cell('........................',{alignment:'center',color:'#788579'})])];
  body.push([cell('รวมหน้านี้ ('+rr.length+' คน)',{colSpan:3,bold:true,fillColor:'#f1f5f1'}),{}, {},...['leave','late','converted','balance','leaveFine','lateFine','total'].map(key=>cell(n(sumField(rr,key)),{alignment:'right',bold:true,fillColor:'#f1f5f1'})),cell('')]);
  const stack=[
   {columns:[{text:'SMS SOFUTO MANAGEMENT SYSTEM',fontSize:10,bold:true,color:'#20573e'},{text:'C1CONCLUDE',alignment:'right',fontSize:10,bold:true,color:'#20573e'}]},
   {canvas:[{type:'line',x1:0,y1:8,x2:786,y2:8,lineWidth:1.2,lineColor:'#29684e'}],margin:[0,0,0,15]},
   {text:'สรุปการลาและมาสายประจำเดือน',bold:true,fontSize:17,alignment:'center',margin:[0,0,0,8]},
   {columns:[{text:monthLabel($('#month').value)+' · '+group.title,bold:true},{text:'หน้า '+(pageIndex+1)+' / '+pages.length,alignment:'right'}],margin:[0,0,0,6]},
   {text:(missing?'ฉบับร่าง · ยังไม่บันทึก '+missing+' จาก '+group.rows.length+' คน — ต้องตรวจสอบก่อนใช้หักเงิน':'บันทึกครบ '+group.rows.length+' คน')+($('#search').value.trim()?' · กรองชื่อ: '+$('#search').value:''),fontSize:9,color:missing?'#906d35':'#42674c',margin:[0,0,0,8]},
   {table:{headerRows:1,widths:[23,'*',49,29,29,29,34,40,40,42,76],body,dontBreakRows:true},layout:{hLineColor:()=> '#b9c6bc',vLineColor:()=> '#b9c6bc',hLineWidth:()=>.5,vLineWidth:()=>.5,paddingLeft:()=>3,paddingRight:()=>3}},
   {text:'รวม'+group.title+' ทุกหน้า '+group.rows.length+' คน · ลา '+n(sumField(group.rows,'leave'))+' วัน · สาย '+n(sumField(group.rows,'late'))+' ครั้ง · หักเงินรวม '+n(sumField(group.rows,'total'))+' บาท',bold:true,fontSize:10,margin:[0,9,0,22]},
   {columns:[['prepared','ผู้จัดทำ'],['checked','ผู้ตรวจสอบ'],['approved','ผู้อนุมัติ']].map(([key,label])=>({width:'*',alignment:'center',stack:[{text:'ลงชื่อ ................................................',margin:[0,3,0,7]},{text:'('+(signers[key]||'................................................')+')',margin:[0,0,0,6]},{text:label,bold:true,margin:[0,0,0,6]},{text:'วันที่ .......... / .......... / ..........'}]})),columnGap:20,fontSize:10},
   {text:'รอบสรุปวันที่ 26 เดือนก่อน–25 เดือนปัจจุบัน · รายการที่ยังไม่บันทึกไม่ถือว่ายืนยันยอดเป็นศูนย์',fontSize:8,color:'#687965',margin:[0,18,0,0]}
  ];
  content.push({stack,pageBreak:pageIndex?'before':undefined});
 }
 return {pageSize:'A4',pageOrientation:'landscape',pageMargins:[28,25,28,25],defaultStyle:{font:'NotoThai',fontSize:10},info:{title:'C1CONCLUDE '+$('#month').value+' '+($('#branch').value||'ทุกสาขา'),author:'SMS SOFUTO MANAGEMENT SYSTEM'},content};
}
async function downloadPdf(){
 const rows=filtered(report);if(!rows.length){notify('ไม่มีพนักงานในเงื่อนไขนี้',true);return;}
 const btn=$('#download-pdf');btn.disabled=true;btn.textContent='กำลังสร้าง PDF…';
 try{const definition=buildPdfDefinition(rows);const blob=await new Promise((resolve,reject)=>{try{pdfMake.createPdf(definition).getBlob(resolve);}catch(e){reject(e);}});download(blob,`C1CONCLUDE-${$('#month').value}-${$('#branch').value||'ทุกสาขา'}.pdf`);notify('สร้างไฟล์ PDF พร้อมช่องลายเซ็นแล้ว');}catch(e){notify('สร้าง PDF ไม่สำเร็จ: '+e.message,true);}finally{btn.disabled=false;btn.textContent='ดาวน์โหลด PDF';}
}
