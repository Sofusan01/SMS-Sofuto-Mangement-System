export const branches=['แม่แตง','ลำพูน','ทุ่งยั้ง','สกลนคร','โพธิชัย'];
export function prepareMonthlyBatch(employees, inputs){
 if(!Array.isArray(inputs)||!inputs.length||inputs.length>1000)throw Error('ไม่พบรายการบันทึก หรือจำนวนรายการเกินกำหนด');
 const keys=new Set();
 return inputs.map(input=>{
  const e=employees.find(e=>e.id===input.employeeId);if(!e)throw Error('ไม่พบพนักงาน');
  const r={employeeId:e.id,month:input.month,leave:Number(input.leave),late:Number(input.late),note:input.note||''};
  validateRecord(r);if(r.month<e.start)throw Error('เดือนก่อนยอดเริ่มต้น บันทึกไม่ได้');
  const key=r.employeeId+'|'+r.month;if(keys.has(key))throw Error('รายการเดือนซ้ำ');keys.add(key);return r;
 });
}
export function validateEmployee(e){
 if(!e.name?.trim()||e.name.length>150||!branches.includes(e.branch))throw Error('กรุณาระบุชื่อและสาขาให้ถูกต้อง');
 if(!Number.isFinite(e.balance)||e.balance<0||e.balance>15||e.balance*2%1)throw Error('สิทธิคงเหลือต้องเป็น 0–15 วัน เพิ่มทีละครึ่งวัน');
 if(!Number.isInteger(e.carry)||e.carry<0||e.carry>5)throw Error('สายยกมาต้องเป็น 0–5 ครั้ง');
 if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(e.start))throw Error('เดือนเริ่มต้นไม่ถูกต้อง');
}
export function validateRecord(r){
 if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(r.month))throw Error('เดือนไม่ถูกต้อง');
 if(!Number.isFinite(r.leave)||r.leave<0||r.leave>31||r.leave*2%1)throw Error('วันลาต้องเป็น 0–31 วัน เพิ่มทีละ 0.5 วัน');
 if(!Number.isInteger(r.late)||r.late<0||r.late>100)throw Error('จำนวนสายต้องเป็นจำนวนเต็ม 0–100');
 if(typeof r.note!=='string'||r.note.length>1000)throw Error('หมายเหตุยาวเกินไป');
}
// Monthly aggregates: actual leave consumes entitlement before lateness conversion.
// Annual reset is explicit at January; opening snapshot applies only from start month.
export function calculate(employee, records, month, policy={resetMonth:1}){
 let balance=employee.balance,carry=employee.carry; const history=[];
 if(month<employee.start)return null;
 let [y,m]=employee.start.split('-').map(Number);
 while(`${y}-${String(m).padStart(2,'0')}`<=month){
  const key=`${y}-${String(m).padStart(2,'0')}`;
  if(key!==employee.start && m===policy.resetMonth){balance=15;carry=0;}
  const r=records.find(r=>r.employeeId===employee.id&&r.month===key)||{leave:0,late:0,note:''};
  const opening=balance,carryIn=carry,paid=Math.min(balance,r.leave);let unpaid=r.leave-paid;
  balance-=paid;
  let converted=0,chargedLate=0;
  if(balance===0){chargedLate=r.late;carry=0;}
  else {
   const total=carry+r.late;
   converted=Math.min(Math.floor(total/6),Math.ceil(balance));
   unpaid+=Math.max(0,converted-balance);
   balance=Math.max(0,balance-converted);
   const residual=total-converted*6;
   if(balance===0){chargedLate=Math.min(r.late,residual);carry=0;}
   else carry=residual;
  }
  const leaveFine=unpaid*150,lateFine=chargedLate*25;
  history.push({employeeId:employee.id,name:employee.name,branch:employee.branch,month:key,opening,carryIn,leave:r.leave,late:r.late,paid,unpaid,converted,balance,carry,leaveFine,chargedLate,lateFine,total:leaveFine+lateFine,note:r.note,saved:records.some(r=>r.employeeId===employee.id&&r.month===key)});
  if(++m===13){m=1;y++;}
 }
 return {...history.at(-1),history};
}
