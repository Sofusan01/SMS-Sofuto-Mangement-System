from pathlib import Path
p=Path('public/index.html')
s=p.read_text(encoding='utf-8')
s=s.replace('<title>','<script>try{document.documentElement.dataset.theme=localStorage.getItem("sms-theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")}catch(e){document.documentElement.dataset.theme="light"}</script><title>',1)
s=s.replace('<div class="avatar" aria-label="ผู้ดูแลระบบ">C1</div>','<div class="header-tools"><button type="button" id="theme-toggle" class="secondary" aria-label="สลับโหมดมืด" aria-pressed="false"><span id="theme-icon" aria-hidden="true">◐</span><span id="theme-label">โหมดมืด</span></button></div>')
p.write_text(s,encoding='utf-8')
p=Path('public/app.js')
s=p.read_text(encoding='utf-8')
s+='''
// Theme preference is local to this browser and does not alter attendance data.
const themeButton=document.querySelector('#theme-toggle');
function syncThemeButton(){
 const dark=document.documentElement.dataset.theme==='dark';
 themeButton.setAttribute('aria-pressed',String(dark));
 themeButton.setAttribute('aria-label',dark?'เปลี่ยนเป็นโหมดสว่าง':'เปลี่ยนเป็นโหมดมืด');
 document.querySelector('#theme-label').textContent=dark?'โหมดสว่าง':'โหมดมืด';
 document.querySelector('#theme-icon').textContent=dark?'☀':'◐';
}
if(themeButton){syncThemeButton();themeButton.addEventListener('click',()=>{
 const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';
 document.documentElement.dataset.theme=theme;
 try{localStorage.setItem('sms-theme',theme)}catch(e){}
 syncThemeButton();
});matchMedia('(prefers-color-scheme: dark)').addEventListener('change',e=>{
 try{if(localStorage.getItem('sms-theme'))return}catch(error){}
 document.documentElement.dataset.theme=e.matches?'dark':'light';syncThemeButton();
});}
'''
p.write_text(s,encoding='utf-8')
