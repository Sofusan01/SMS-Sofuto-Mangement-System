from pathlib import Path
p=Path('public/app.js');s=p.read_text(encoding='utf-8')
a=s.index('function archiveTable(');b=s.index('function archiveView',a)
t=s[a:b];start=t.index('<tr class="total-row">');end=t.index('</tr>',start)+len('</tr>');t=t[:start]+t[end:];s=s[:a]+t+s[b:]
s='\n'.join(line for line in s.split('\n') if "[c('รวมหน้านี้'" not in line)
p.write_text(s,encoding='utf-8')
