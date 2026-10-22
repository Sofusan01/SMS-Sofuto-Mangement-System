import fs from 'node:fs';import vm from 'node:vm';import {calculate,branches} from '../engine.mjs';
const els=new Map();for(const k of ['#editor','#close','#cancel','#month','#branch','#search'])els.set(k,{value:k==='#month'?'2026-09':'',innerHTML:'',textContent:''});
const sandbox={console,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,setTimeout,clearTimeout,setImmediate,clearImmediate,Blob,URL,Buffer,window:{addEventListener(){}},navigator:{userAgent:'Node'},document:{querySelector:s=>els.get(s)||null,createElement:()=>({download:'',dispatchEvent(){},setAttribute(){}})},location:{hash:''},history:{}};
sandbox.window=sandbox;sandbox.addEventListener=()=>{};sandbox.self=sandbox;vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('public/vendor/pdfmake.min.js','utf8'),sandbox);
vm.runInContext(fs.readFileSync('public/vendor/thai-fonts.js','utf8'),sandbox);
vm.runInContext(fs.readFileSync('public/app.js','utf8').replace('load().catch(e=>notify(e.message,true));',''),sandbox);
const historical=process.argv.includes('--august');const seed=JSON.parse(fs.readFileSync('seed.json','utf8')),rr=historical?JSON.parse(fs.readFileSync('august-history.json','utf8')):seed.employees.map(e=>calculate(e,[],'2026-09'));if(historical)els.get('#month').value='2026-08';
vm.runInContext(`state=${JSON.stringify({employees:seed.employees,branches})};report=${JSON.stringify(rr)};`,sandbox);
fs.mkdirSync('outputs/pdf',{recursive:true});
for(const [name,branch] of (historical?[['TRO-2569-08-history.pdf','']]:[['TRO-2569-09-all-branches.pdf',''],['TRO-2569-09-maetaeng.pdf','แม่แตง']])){
 els.get('#branch').value=branch;
 const buffer=await vm.runInContext("new Promise(resolve=>pdfMake.createPdf(buildPdfDefinition(filtered(report))).getBuffer(resolve))",sandbox);
 fs.writeFileSync('outputs/pdf/'+name,Buffer.from(buffer));console.log(name,buffer.length);
}
