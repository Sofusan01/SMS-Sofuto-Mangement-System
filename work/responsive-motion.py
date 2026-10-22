from pathlib import Path
p=Path('public/index.html');s=p.read_text(encoding='utf-8').replace('aria-controls="sidebar-menu"','aria-controls="sidebar-drawer"').replace('<details id="sidebar-menu"','<div id="sidebar-drawer"><div class="sidebar-drawer-inner"><details id="sidebar-menu"').replace('</details></details></aside>','</details></details></div></div></aside>');p.write_text(s,encoding='utf-8')
p=Path('public/app.js');s=p.read_text(encoding='utf-8').replace(" let previousOpen;"," const mobileSidebar=matchMedia('(max-width:760px)');\n const drawer=document.querySelector('#sidebar-drawer');\n let previousOpen;")
s=s.replace("  if(collapsed){previousOpen=groups.map(g=>g.open);groups.forEach(g=>g.open=true);}","  if(collapsed&&!previousOpen){previousOpen=groups.map(g=>g.open);groups.forEach(g=>g.open=true);}\n  if(drawer)drawer.inert=collapsed&&mobileSidebar.matches;")
s=s.replace(' applySidebar();\n}'," mobileSidebar.addEventListener('change',()=>{if(drawer)drawer.inert=root.dataset.sidebar==='collapsed'&&mobileSidebar.matches;});\n applySidebar();\n}")
p.write_text(s,encoding='utf-8')
