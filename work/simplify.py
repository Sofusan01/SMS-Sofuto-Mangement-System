from pathlib import Path
import re
p=Path('public/index.html');s=p.read_text(encoding='utf-8')
match=re.search(r'<nav aria-label="เมนูระบบลาและมาสาย">(.*?)</nav>',s)
links=re.findall(r'<a .*?</a>',match.group(1))
primary=[];secondary=[]
for link in links:
    if 'data-page="monthly"' in link:link=link.replace('บันทึกรายเดือน','เพิ่มข้อมูลรายเดือน')
    if 'data-page="reports"' in link:link=link.replace('รายงานและ Excel','สรุป PDF / Excel')
    (secondary if 'data-page="employees"' in link or 'data-page="settings"' in link else primary).append(link)
replacement='<nav aria-label="เมนูหลัก C1CONCLUDE">'+''.join(primary)+'</nav><details class="admin-menu"><summary>จัดการข้อมูลและตั้งค่า</summary><nav aria-label="เมนูจัดการข้อมูล">'+''.join(secondary)+'</nav></details>'
s=s[:match.start()]+replacement+s[match.end():]
p.write_text(s,encoding='utf-8')
p=Path('public/app.js');s=p.read_text(encoding='utf-8')
s=s.replace("monthly:['บันทึกการลาและมาสาย','บันทึกยอดรวมของแต่ละคนประจำเดือน • แก้ย้อนหลังแล้วคำนวณใหม่อัตโนมัติ']","monthly:['เพิ่มข้อมูลรายเดือน','เลือกเดือนและสาขา → กรอกลาและสาย → บันทึกพร้อมกัน']")
s=s.replace("reports:['รายงานการลาและมาสาย','ตรวจสอบยอดแยกสาขาและยอดรวม พร้อมส่งออก Excel']","reports:['สรุป PDF / Excel','เลือกเดือนและสาขา ตรวจสรุป แล้วบันทึก PDF พร้อมช่องลายเซ็น']")
lines=s.splitlines()
for i,line in enumerate(lines):
 if line.startswith(" }else if(page==='monthly')"):
  lines[i]=" }else if(page==='monthly')html=monthlyEntry(rows);"
 if line.startswith(" else if(page==='reports')"):
  lines[i]=" else if(page==='reports')html=reportScreen(rows);"
s='\n'.join(lines)+'\n'
s=s.replace("html=cards(rows)+`<section", "html=overviewIntro(rows)+cards(rows)+`<section",1)
s=s.replace("${table([...rows].sort((a,b)=>a.balance-b.balance))}","${branchSummary(rows)}${table([...rows].sort((a,b)=>a.balance-b.balance))}")
s=s.replace(" $('#content').innerHTML=html;bind();"," $('#content').innerHTML=html;bind();bindSimplePages();document.querySelector('.admin-menu').open=['employees','settings'].includes(page);")
s=s.replace(" if($('#print'))$('#print').onclick=()=>window.print();"," if($('#print'))$('#print').onclick=printReport;")
# Clear unsaved edits only after confirmation, keeping each input when a filter is cancelled.
s=s.replace("$('#month').onchange=refresh;$('#branch').onchange=$('#search').oninput=()=>state&&render();window.onhashchange=()=>state&&render();", "$('#month').onchange=guardedRefresh;$('#branch').onchange=$('#search').oninput=guardedFilter;window.onhashchange=guardedNavigation;")
p.write_text(s,encoding='utf-8')
