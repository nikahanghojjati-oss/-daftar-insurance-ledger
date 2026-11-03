import test from 'node:test';
import assert from 'node:assert/strict';
import {makePolicy,recordPayment,similarPayments,voidPayment,restorePayment,policySummary,validateLedger,emptyLedger,dateInput,today,uid} from '../dist/core.js';
const date=()=>dateInput(today());
const policy=()=>makePolicy({title:'بیمه آزمایشی',total:'۱۰۰۰',down:'۰',count:'۴',frequency:'monthly',firstDate:date(),paymentDate:date()});
const payment=(extra={})=>({amount:'۱۰۰',date:date(),...extra});
test('A retry with the same stable payment ID cannot record money twice',()=>{
  const id=uid(),p=recordPayment(policy(),payment({id})),retried=recordPayment(p,payment({id}));
  assert.equal(retried.payments.length,1);assert.equal(policySummary(retried).paid,100);assert.throws(()=>recordPayment(p,payment({id,amount:'۲۰۰'})));
});
test('Potential duplicates are flagged without silently discarding a legitimate second receipt',()=>{
  const p=recordPayment(policy(),payment());assert.equal(similarPayments(p,payment()).length,1);assert.equal(similarPayments(p,payment({amount:'۲۰۰'})).length,0);
  const second=recordPayment(p,payment());assert.equal(second.payments.length,2);assert.equal(policySummary(second).paid,200);
});
test('Cancellation preserves ID, amount, date and history and restores debt; undo returns exact totals',()=>{
  const p=recordPayment(policy(),payment()),before=policySummary(p),receipt=p.payments[0];
  const canceled=voidPayment(p,receipt.id);assert.equal(canceled.payments.length,1);assert.equal(canceled.payments[0].amount,receipt.amount);assert.equal(canceled.payments[0].date,receipt.date);assert.equal(policySummary(canceled).paid,0);assert.equal(policySummary(canceled).owed,1000);
  assert.equal(similarPayments(canceled,payment()).length,0);assert.throws(()=>voidPayment(canceled,receipt.id));
  const restored=restorePayment(canceled,receipt.id);assert.equal(restored.payments[0].id,receipt.id);assert.deepEqual(restored.payments[0].revisions.map(r=>r.action),['void','restore']);assert.equal(policySummary(restored).paid,before.paid);assert.equal(policySummary(restored).owed,before.owed);
});
test('Cannot undo a cancellation if replacement payments would create an overpayment',()=>{
  let p=recordPayment(policy(),payment({amount:'۱۰۰۰'})),id=p.payments[0].id;p=voidPayment(p,id);p=recordPayment(p,payment({amount:'۱۰۰۰'}));assert.throws(()=>restorePayment(p,id));
});
test('Version-one ledgers migrate without changing money; canceled-payment backup round trip retains audit',()=>{
  const old={...emptyLedger('rial'),schemaVersion:1,customers:[{id:uid(),name:'نمونه',phone:'',notes:'',policies:[recordPayment(policy(),payment())]}]},oldText=JSON.stringify(old);
  const migrated=validateLedger(old);assert.equal(migrated.schemaVersion,2);assert.equal(JSON.stringify(old),oldText);assert.equal(policySummary(migrated.customers[0].policies[0]).paid,100);
  migrated.customers[0].policies[0]=voidPayment(migrated.customers[0].policies[0],migrated.customers[0].policies[0].payments[0].id);
  const restored=validateLedger(JSON.parse(JSON.stringify(migrated)));assert.equal(policySummary(restored.customers[0].policies[0]).paid,0);assert.equal(restored.customers[0].policies[0].payments[0].revisions.length,1);
});
