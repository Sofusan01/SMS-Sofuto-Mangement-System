from pathlib import Path
p=Path('public/index.html');s=p.read_text(encoding='utf-8')
s=s.replace('<body><aside>','<body><aside id="sidebar"><button type="button" id="sidebar-toggle" class="secondary" aria-label="ยุบเมนู" aria-expanded="true" aria-controls="sidebar-menu" title="ยุบเมนู"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16m7-11-3 3 3 3"/></svg></button>')
s=s.replace('<details class="menu-group" open>','<details id="sidebar-menu" class="menu-group" open>')
s=s.replace('<title>','<script>try{document.documentElement.dataset.sidebar=localStorage.getItem("sms-sidebar")||"expanded"}catch(e){}</script><title>',1)
p.write_text(s,encoding='utf-8')
