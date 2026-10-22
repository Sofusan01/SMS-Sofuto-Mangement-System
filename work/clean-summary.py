from pathlib import Path
p=Path('public/app.js');s=p.read_text(encoding='utf-8')
a=s.index('function archivePrintPages(');b=s.index('function buildArchivePdfDefinition',a)
s=s[:a]+'''function archivePrintPages(rows){return pdfChunks(rows).map(g=>`<article class="print-sheet"><h2>ประวัติการลาและมาสาย · สิงหาคม 2569</h2><div class="document-meta"><strong>${esc(g.title)}</strong></div>${archiveTable(g.pageRows)}</article>`).join('');}
'''+s[b:]
a=s.index('function buildArchivePdfDefinition');b=s.index('\nload().catch',a)
t=s[a:b];lines=t.splitlines();out=[]
for line in lines:
 if any(x in line for x in ["{columns:[{text:'SMS SOFUTO", "{text:'ตัวเลขจากไฟล์ต้นฉบับ", "{columns:[['prepared'", "{text:[...new Set(g.pageRows", "{text:'เดือนอ้างอิงตามชื่อไฟล์"]):continue
 if "{columns:[{text:g.title" in line:line="   {text:g.title,bold:true,margin:[0,0,0,10]},"
 out.append(line)
s=s[:a]+'\n'.join(out)+'\n'+s[b:]
p.write_text(s,encoding='utf-8')
