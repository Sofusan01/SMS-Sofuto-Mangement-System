from pathlib import Path
import json,openpyxl
seed=json.loads(Path('seed.json').read_text(encoding='utf-8'))
w=openpyxl.load_workbook('สิงหาคม2569.xlsx',data_only=True)
rows=[]
for s in w:
 branch=s.title.strip().replace('โพธิ์ชัย','โพธิชัย')
 for rownum,r in enumerate(s.values,1):
  if not isinstance(r[0],(int,float)) or not r[1]:continue
  e=next(e for e in seed['employees'] if e['branch']==branch and e['name']==str(r[1]).strip())
  rows.append(dict(employeeId=e['id'],name=e['name'],branch=branch,month='2026-08',archive=True,previousLeave=r[2],previousLate=r[3],leave=r[4],late=r[5],sourceUsed=r[6],balance=r[7],carry=r[8],sourceSheet=s.title,sourceRow=rownum,sourceTitle=s.cell(1,1).value,saved=True,total=None,leaveFine=None,lateFine=None,opening=None,converted=None,carryIn=r[3],note='ข้อมูลตามไฟล์สิงหาคม2569.xlsx'))
Path('august-history.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
print('Imported source snapshot:',len(rows),'employees; current leave',sum(r['leave'] or 0 for r in rows),'late',sum(r['late'] or 0 for r in rows))
