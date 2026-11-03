import test from 'node:test';
import assert from 'node:assert/strict';
import {digits,normalize,amount,fromJalali,parseDate,dateInput,jparts,addDays,addMonths,today,makePolicy,recordPayment,policySummary,customerSummary,ledgerSummary,dueItems,emptyLedger,demoLedger,validateLedger} from '../dist/core.js';
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
test('Every day of 1403–1406 round trips and month-end schedules stay anchored',()=>{
  for(let i=0;i<1461;i++){const iso=addDays('2024-03-20',i);assert.equal(parseDate(dateInput(iso)),iso);}
  const first=fromJalali(1403,6,31);assert.deepEqual(jparts(addMonths(first,1)),{y:1403,m:7,d:30});assert.deepEqual(jparts(addMonths(first,6)),{y:1403,m:12,d:30});assert.deepEqual(jparts(addMonths(first,7)),{y:1404,m:1,d:31});
  assert.deepEqual(jparts(addMonths(fromJalali(1404,11,30),1)),{y:1404,m:12,d:29});
  assert.deepEqual(jparts(addMonths(fromJalali(1405,8,3),1)),{y:1405,m:9,d:3});
});
test('Monthly and weekly schedules sum exactly, remainder goes to last installment',()=>{
  const p=policy({total:'۱۰۰۱'});assert.deepEqual(p.installments.map(i=>i.amount),[100,300,300,301]);assert.equal(p.installments.reduce((s,i)=>s+i.amount,0),1001);
  const week=policy({frequency:'weekly',down:'۰'});assert.equal(week.installments[1].dueDate,addDays(week.installments[0].dueDate,7));
  const monthly=policy({firstDate:'۱۴۰۳/۰۶/۳۱',count:'۸',down:'۰'});assert.equal(dateInput(monthly.installments.at(-1).dueDate),'۱۴۰۴/۰۱/۳۱');
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
