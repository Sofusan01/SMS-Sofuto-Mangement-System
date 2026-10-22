import json
from pathlib import Path
p=Path('august-history.json');rows=json.loads(p.read_text(encoding='utf-8'))
r=next(r for r in rows if r['employeeId']=='10' and r['branch']=='แม่แตง')
r.update(total=600,leaveFine=600,lateFine=0,opening=0,unpaid=4,chargedLate=0,deductionConfirmed=True,confirmationDate='2026-10-21',note='ผู้ใช้ยืนยันว่าหมดสิทธิลาก่อนเข้าสิงหาคม 2569 ลาเกินสิทธิ 4 วัน')
p.write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
p=Path('public/app.js');s=p.read_text(encoding='utf-8').replace(" if(rows.some(r=>r.archive))return ['ข้อมูลสิงหาคมไม่มีค่าหักเงินที่ยืนยันในต้นฉบับ จึงยังระบุผู้ถูกหักและยอดหักไม่ได้'];",'')
s=s.replace(" if(!charged.length)lines.push('ไม่มีรายการหักเงินในข้อมูลที่บันทึกแล้วของหน้านี้');"," if(rows.some(r=>r.archive&&!r.deductionConfirmed))lines.push('รายการอื่นในประวัติสิงหาคมยังไม่มีการยืนยันค่าหักเงิน');\n if(!charged.length&&!rows.some(r=>r.archive))lines.push('ไม่มีรายการหักเงินในข้อมูลที่บันทึกแล้วของหน้านี้');")
s=s.replace('และไม่มีข้อมูลค่าหักเงินที่ยืนยันในไฟล์','ค่าหักเงินที่ยืนยันเพิ่มเติมแสดงในหมายเหตุรายงาน')
p.write_text(s,encoding='utf-8')
