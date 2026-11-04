import test from 'node:test';
import assert from 'node:assert/strict';
import {digits,normalize,amount,fromJalali,parseDate,dateInput,jparts,addDays,addMonths,firstInsuranceDue,today,tehranDay,setClockOffset,makePolicy,reviseSchedule,recordPayment,policySummary,customerSummary,ledgerSummary,dueItems,emptyLedger,demoLedger,validateLedger} from '../dist/core.js';
const policy=(extra={})=>makePolicy({title:'بیمه آزمایشی',number:'۱۰۱',total:'۱۰۰۰',down:'۱۰۰',count:'۳',frequency:'monthly',firstDate:'۱۴۰۵/۰۷/۳۰',paymentDate:'۱۴۰۵/۰۷/۱۰',...extra});
test('Persian, Arabic and Latin numbers; no decimals, negatives or silent truncation',()=>{
  assert.equal(digits('۱۲٣۴٥۶'),'123456');assert.equal(amount('۱۲٬۳۴۵'),12345);assert.equal(amount('١٢,٣٤٥'),12345);assert.equal(amount('12345'),12345);
  for(const value of ['۱.۵','-۱۰','۱e۳','','۱٫۵','9999999999999999999'])assert.throws(()=>amount(value));
  assert.equal(normalize('علي كريمي ۰۹۱۲'),normalize('علی کریمی 0912'));
});
test('Known Persian calendar dates and leap years',()=>{
  assert.equal(fromJalali(1403,1,1),'2024-03-20');assert.equal(fromJalali(1404,1,1),'2025-03-21');assert.equal(fromJalali(1405,8,10),'2026-11-01');
  assert.equal(parseDate('۱۴۰۵/۰۸/۱۰'),'2026-11-01');assert.equal(parseDate('١٤٠٥/٠٨/١٠'),'2026-11-01');
  assert.equal(fromJalali(1403,12,30),'2025-03-20');assert.throws(()=>fromJalali(1404,12,30));assert.throws(()=>parseDate('۱۴۰۵/۰۷/۳۱'));assert.throws(()=>parseDate('۱۴۰۵/۱۳/۱۰'));
  assert.throws(()=>jparts('2026-02-30'));
});
test('Tehran date changes at Tehran midnight, including a Persian new year, without cached startup date',()=>{
  assert.equal(tehranDay(Date.parse('2026-11-02T20:29:59Z')),'2026-11-02');
  assert.equal(tehranDay(Date.parse('2026-11-02T20:30:00Z')),'2026-11-03');
  assert.equal(dateInput(tehranDay(Date.parse('2025-03-20T21:00:00Z'))),'۱۴۰۴/۰۱/۰۱');
  setClockOffset(0);assert.equal(today(),tehranDay(Date.now()));
});
test('Insurance installments start one Persian month plus fifteen calendar days after issuance',()=>{
  const issued=parseDate('۱۴۰۴/۱۲/۰۵');assert.equal(dateInput(firstInsuranceDue(issued)),'۱۴۰۵/۰۱/۲۰');
  const p=makePolicy({title:'بیمه',total:'۱۰۰۱',down:'۱۰۱',count:'۵',frequency:'monthly',plan:'installments',paymentDate:'۱۴۰۴/۱۲/۰۵'});
  assert.equal(dateInput(p.installments[1].dueDate),'۱۴۰۵/۰۱/۲۰');
  assert.equal(dateInput(p.installments.at(-1).dueDate),'۱۴۰۵/۰۵/۲۰');
  assert.equal(p.installments.reduce((sum,i)=>sum+i.amount,0),1001);assert.equal(policySummary(p).owed,900);
  const custom=makePolicy({title:'بیمه',total:'۱۰۰۰',down:'۲۰۰',count:'۲',plan:'installments',frequency:'monthly',paymentDate:'۱۴۰۴/۱۲/۰۵',firstDate:'۱۴۰۵/۰۱/۲۰',installmentDates:['۱۴۰۵/۰۲/۰۱','۱۴۰۵/۰۴/۰۳'],installmentAmounts:['۳۰۰','۵۰۰']});
  assert.deepEqual(custom.installments.map(i=>i.amount),[200,300,500]);assert.equal(dateInput(custom.installments.at(-1).dueDate),'۱۴۰۵/۰۴/۰۳');
  const cash=makePolicy({title:'بیمه',total:'۱۰۰۰',plan:'cash',paymentDate:'۱۴۰۴/۱۲/۰۵'});assert.equal(cash.frequency,'cash');assert.equal(policySummary(cash).owed,0);assert.equal(validateLedger({schemaVersion:2,currency:'toman',customers:[{id:'customer',name:'مشتری',phone:'',notes:'',policies:[cash]}]}).customers.length,1);
  assert.throws(()=>makePolicy({title:'بیمه',total:'۱۰۰۰',down:'۰',count:'۵',plan:'installments',frequency:'monthly',paymentDate:'۱۴۰۴/۱۲/۰۵'}));
  assert.throws(()=>makePolicy({title:'بیمه',total:'۱۰۰۰',down:'۱۰۰',count:'۷',plan:'installments',frequency:'monthly',paymentDate:'۱۴۰۴/۱۲/۰۵'}));
});
test('A saved installment schedule can be revised without changing total, receipts or IDs',()=>{
  const original=makePolicy({total:'۱۰۰۰',down:'۲۰۰',count:'۲',plan:'installments',frequency:'monthly',paymentDate:'۱۴۰۴/۱۲/۰۵'}),regular=original.installments.filter(i=>i.kind==='regular');
  const revised=reviseSchedule(original,[{date:'۱۴۰۵/۰۲/۰۱',amount:'۳۰۰'},{date:'۱۴۰۵/۰۳/۰۱',amount:'۵۰۰'}]);
  assert.deepEqual(revised.installments.filter(i=>i.kind==='regular').map(i=>i.id),regular.map(i=>i.id));
  assert.equal(revised.payments[0].id,original.payments[0].id);assert.equal(policySummary(revised).owed,800);
  assert.equal(validateLedger({schemaVersion:2,currency:'toman',customers:[{id:'customer',name:'مشتری',phone:'',notes:'',policies:[revised]}]}).customers.length,1);
  assert.throws(()=>reviseSchedule(revised,[{date:'۱۴۰۵/۰۲/۰۱',amount:'۳۰۱'},{date:'۱۴۰۵/۰۳/۰۱',amount:'۵۰۰'}]),/جمع/);
});
test('Every day of 1403–1406 round trips and month-end schedules stay anchored',()=>{
  for(let i=0;i<1461;i++){const iso=addDays('2024-03-20',i);assert.equal(parseDate(dateInput(iso)),iso);}
  const first=fromJalali(1403,6,31);assert.deepEqual(jparts(addMonths(first,1)),{y:1403,m:7,d:30});assert.deepEqual(jparts(addMonths(first,6)),{y:1403,m:12,d:30});assert.deepEqual(jparts(addMonths(first,7)),{y:1404,m:1,d:31});
  assert.deepEqual(jparts(addMonths(fromJalali(1404,11,30),1)),{y:1404,m:12,d:29});
  assert.deepEqual(jparts(addMonths(fromJalali(1405,8,3),1)),{y:1405,m:9,d:3});
});
test('Monthly and weekly schedules sum exactly, remainder goes to last installment',()=>{
  const p=policy({total:'۱۰۰۱'});assert.deepEqual(p.installments.map(i=>i.amount),[100,300,300,301]);assert.equal(p.installments.reduce((s,i)=>s+i.amount,0),1001);
  const week=policy({frequency:'weekly',down:'۰'});assert.equal(week.installments[1].dueDate,addDays(week.installments[0].dueDate,7));
  const monthly=policy({firstDate:'۱۴۰۳/۰۶/۳۱',count:'۶',down:'۰'});assert.equal(dateInput(monthly.installments.at(-1).dueDate),'۱۴۰۳/۱۱/۳۰');
});
test('Debt only decreases for recorded money; partial and early payments allocate oldest first',()=>{
  let p=policy();const s=policySummary(p,'2026-11-01');assert.equal(s.paid,100);assert.equal(s.owed,900);assert.equal(s.overdue,300);
  assert.equal(policySummary(p,'2027-11-01').owed,900);
  p=recordPayment(p,{amount:'۱۵۰',date:'۱۴۰۵/۰۸/۱۰'});assert.equal(policySummary(p).paid,250);assert.equal(policySummary(p).owed,750);assert.equal(policySummary(p).pending[0].left,150);
  p=recordPayment(p,{amount:'۴۵۰',date:'۱۴۰۵/۰۸/۱۰'});assert.equal(policySummary(p).owed,300);assert.equal(policySummary(p).pending.length,1);assert.equal(policySummary(p).pending[0].left,300);
  p=recordPayment(p,{amount:'۳۰۰',date:'۱۴۰۵/۰۸/۱۰'});assert.equal(policySummary(p).next,null);assert.equal(policySummary(p).owed,0);
  assert.throws(()=>recordPayment(p,{amount:'۱',date:'۱۴۰۵/۰۸/۱۰'}));
});
test('Reject overpayments, future actual payments and invalid schedules',()=>{
  assert.throws(()=>recordPayment(policy(),{amount:'۹۰۱',date:'۱۴۰۵/۰۸/۱۰'}));assert.throws(()=>recordPayment(policy(),{amount:'۰',date:'۱۴۰۵/۰۸/۱۰'}));
  assert.throws(()=>recordPayment(policy(),{amount:'۱۰۰',date:dateInput(addDays(today(),1))}));
  for(const extra of [{total:'۰'},{down:'۱۰۰۱'},{count:'۰'},{count:'۱۲۱'},{total:'۳',down:'۱',count:'۳'},{frequency:'yearly'},{firstDate:'۱۴۰۵/۰۷/۳۱'}])assert.throws(()=>policy(extra));
});
test('Canceling a payment returns debt; totals across profiles/dashboard/dues agree',()=>{
  let p=recordPayment(policy(),{amount:'۳۰۰',date:'۱۴۰۵/۰۸/۱۰'});const last=p.payments.at(-1).id;p.payments=p.payments.filter(x=>x.id!==last);assert.equal(policySummary(p).owed,900);
  const data=demoLedger();assert.equal(validateLedger(data),data);const total=ledgerSummary(data);assert.equal(total.total,total.paid+total.owed);
  assert.equal(total.owed,dueItems(data).reduce((s,i)=>s+i.left,0));
  assert.equal(total.paid,data.customers.reduce((s,c)=>s+customerSummary(c).paid,0));
});
test('Fully prepaid policy has no remaining dates or debt',()=>{
  const s=policySummary(policy({down:'۱۰۰۰'}));assert.equal(s.owed,0);assert.deepEqual(s.pending,[]);assert.equal(s.paid,1000);
});
test('Backup round trip and strict invalid-file rejection',()=>{
  const data=demoLedger(),restored=validateLedger(JSON.parse(JSON.stringify(data)));assert.deepEqual(restored,data);assert.deepEqual(validateLedger(emptyLedger('rial')),emptyLedger('rial'));
  const bad=[null,{}, {...data,schemaVersion:999},{...data,currency:'dollar'}];
  const corrupt=fn=>{const d=structuredClone(data);fn(d);bad.push(d);};
  corrupt(d=>d.customers[1].id=d.customers[0].id);corrupt(d=>d.customers[0].policies[0].installments[0].amount++);corrupt(d=>d.customers[0].policies[0].payments[0].amount=999999999999);corrupt(d=>d.customers[0].policies[0].payments[0].date='2026-02-30');corrupt(d=>d.customers[0].name='<'.repeat(101));
  for(const b of bad)assert.throws(()=>validateLedger(b));
});



test('New policies default to first Jalali month plus 15 days, then anchored monthly installments',()=>{
  const input={title:'بیمه',total:'۱۰۰۱',down:'۱۰۱',count:'۵',plan:'installments',paymentDate:'۱۴۰۴/۱۲/۰۵'};
  const p=makePolicy(input),regular=p.installments.filter(i=>i.kind==='regular');
  assert.equal(p.frequency,'monthly');
  assert.deepEqual(regular.map(i=>dateInput(i.dueDate)),['۱۴۰۵/۰۱/۲۰','۱۴۰۵/۰۲/۲۰','۱۴۰۵/۰۳/۲۰','۱۴۰۵/۰۴/۲۰','۱۴۰۵/۰۵/۲۰']);
  for(let n=1;n<regular.length;n++)assert.equal(regular[n].dueDate,addMonths(regular[0].dueDate,n));
  assert.equal(p.installments.reduce((sum,i)=>sum+i.amount,0),1001);assert.equal(policySummary(p).owed,900);
  const restored=validateLedger(JSON.parse(JSON.stringify({...emptyLedger('toman'),customers:[{id:'customer',name:'آزمایش',phone:'',notes:'',policies:[p]}]})));
  assert.equal(restored.customers[0].policies[0].frequency,'monthly');
});
test('Legacy recurring one-month-plus-15-day cadence remains explicit and restorable',()=>{
  const p=makePolicy({title:'بیمه',total:'۱۰۰۱',down:'۱۰۱',count:'۵',plan:'installments',paymentDate:'۱۴۰۴/۱۲/۰۵',frequency:'month-plus-15'});
  assert.deepEqual(p.installments.filter(i=>i.kind==='regular').map(i=>dateInput(i.dueDate)),['۱۴۰۵/۰۱/۲۰','۱۴۰۵/۰۳/۰۴','۱۴۰۵/۰۴/۱۹','۱۴۰۵/۰۶/۰۳','۱۴۰۵/۰۷/۱۸']);
  const restored=validateLedger(JSON.parse(JSON.stringify({...emptyLedger('toman'),customers:[{id:'customer',name:'قدیمی',phone:'',notes:'',policies:[p]}]})));
  assert.equal(restored.customers[0].policies[0].frequency,'month-plus-15');
});
test('Calendar-plus-15 recurrence clamps Esfand correctly and supports a custom first date',()=>{
  const p=makePolicy({title:'بیمه',total:'۱۰۰۰',down:'۱۰۰',count:'۳',plan:'installments',frequency:'month-plus-15',paymentDate:'۱۴۰۴/۱۱/۰۱',firstDate:'۱۴۰۴/۱۱/۳۰'});
  assert.deepEqual(p.installments.filter(i=>i.kind==='regular').map(i=>dateInput(i.dueDate)),['۱۴۰۴/۱۱/۳۰','۱۴۰۵/۰۱/۱۵','۱۴۰۵/۰۲/۳۰']);
  assert.equal(addDays(parseDate('۱۴۰۴/۱۱/۳۰'),45),parseDate('۱۴۰۵/۰۱/۱۶'));
});
test('Explicit monthly and weekly choices retain their original spacing',()=>{
  const args={title:'بیمه',total:'۱۰۰۰',down:'۱۰۰',count:'۳',plan:'installments',paymentDate:'۱۴۰۴/۱۲/۰۵'};
  const monthly=makePolicy({...args,frequency:'monthly'}).installments.filter(i=>i.kind==='regular');
  const weekly=makePolicy({...args,frequency:'weekly'}).installments.filter(i=>i.kind==='regular');
  assert.equal(dateInput(monthly[1].dueDate),'۱۴۰۵/۰۲/۲۰');assert.equal(weekly[1].dueDate,addDays(weekly[0].dueDate,7));
});
