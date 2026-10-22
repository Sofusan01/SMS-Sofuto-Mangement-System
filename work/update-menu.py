from pathlib import Path
p=Path('public/index.html')
s=p.read_text(encoding='utf-8')
s=s.replace('<div class="workspace">ตรอ. • 5 สาขา</div>','')
icons={
'dashboard':'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
'monthly':'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18m-13 5h2m4 0h2"/>',
'employees':'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
'reports':'<path d="M4 3v18h17M9 16v-5m5 5V7m5 9v-7"/>',
'settings':'<path d="m9 3-.8 2.4-2.5.6L4 9l1.7 1.9v2.2L4 15l1.7 3 2.5.6L9 21h6l.8-2.4 2.5-.6 1.7-3-1.7-1.9v-2.2L20 9l-1.7-3-2.5-.6L15 3Z"/><circle cx="12" cy="12" r="3"/>'}
labels={'dashboard':'ภาพรวม','monthly':'บันทึกรายเดือน','employees':'พนักงานและยอดยกมา','reports':'รายงานและ Excel','settings':'ตั้งค่าและสำรองข้อมูล'}
nav='<nav aria-label="เมนูระบบลาและมาสาย">'+''.join(f'<a href="#{key}" data-page="{key}"><svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{icons[key]}</svg><span>{label}</span><svg class="nav-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></a>' for key,label in labels.items())+'</nav>'
start=s.index('<details open>');end=s.index('</details>',start)+len('</details>')
s=s[:start]+'<details class="menu-group" open><summary><span class="module-mark">C1</span><span class="module-title">C1CONCLUDE<small>ลาและมาสาย</small></span><svg class="group-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary>'+nav+'</details>'+s[end:]
p.write_text(s,encoding='utf-8')
