from pathlib import Path
p=Path('public/app.js');s=p.read_text(encoding='utf-8')
s=s.replace("const summaryTotal=(rows,key)=>rows.some(r=>r[key]===null||r[key]===undefined)?'—':n(sumField(rows,key));", "const hidePrevious=(r,key)=>['previousLeave','previousLate'].includes(key)&&r.saved&&(Number(r.unpaid)>0||Number(r.leaveFine)>0);\nconst summaryValue=(r,key)=>hidePrevious(r,key)?'':sourceN(r[key]);\nconst summaryTotal=(rows,key)=>{const shown=rows.filter(r=>!hidePrevious(r,key));return !shown.length?'':shown.some(r=>r[key]===null||r[key]===undefined)?'—':n(sumField(shown,key));};")
s=s.replace('${sourceN(r[k])}</td>','${summaryValue(r,k)}</td>').replace('c(sourceN(r[k]),','c(summaryValue(r,k),')
p.write_text(s,encoding='utf-8')
