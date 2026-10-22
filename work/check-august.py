import json,sqlite3
from pathlib import Path
import openpyxl
rows=json.loads(Path('august-history.json').read_text(encoding='utf-8'))
w=openpyxl.load_workbook('สิงหาคม2569.xlsx',data_only=True)
assert len(rows)==23 and len(set(r['branch'] for r in rows))==5
fields=['previousLeave','previousLate','leave','late','sourceUsed','balance','carry']
for r in rows:
 s=w[r['sourceSheet']]
 assert [r[k] for k in fields]==[s.cell(r['sourceRow'],col).value for col in range(3,10)]
assert sum(r['leave'] or 0 for r in rows)==8
assert sum(r['late'] or 0 for r in rows)==3
with sqlite3.connect('file:data/c1conclude.sqlite?mode=ro',uri=True) as db:
 state=json.loads(db.execute('SELECT json FROM state WHERE id=1').fetchone()[0])
Path('work/prehistory-state.json').write_text(json.dumps(state,ensure_ascii=False),encoding='utf-8')
print('PASS: all 161 source cells match original workbook exactly; 23 employees, 5 branches, August leave 8 / late 3; current database snapshot saved for non-regression check')
