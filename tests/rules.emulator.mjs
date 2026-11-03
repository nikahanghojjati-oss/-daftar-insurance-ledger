import test from 'node:test';
import assert from 'node:assert/strict';
import {FirebaseRest} from '../dist/firebase-rest.js';
import {LedgerSync} from '../dist/sync.js';
import {emptyLedger,makePolicy,recordPayment,policySummary} from '../dist/core.js';
import {queueChanges} from '../dist/sync-model.js';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,deleteDoc} from 'firebase/firestore';
const owner='i6VYpbhc1Iaf0qNjILLRnwhvISR2';
const env=await initializeTestEnvironment({projectId:'demo-daftar',firestore:{rules:await readFile('firestore.sync.rules','utf8')}});
const path=`ledgers/${owner}`;
const good={payload:'{"id":"fictional"}',operation:'fictional-operation'};
try {
 await test('rules deny anonymous, other accounts, other ledger paths and unknown collections',async()=>{
   const anon=env.unauthenticatedContext().firestore(),other=env.authenticatedContext('someone-else').firestore(),mine=env.authenticatedContext(owner).firestore();
   await assertFails(getDoc(doc(anon,path)));await assertFails(setDoc(doc(anon,path),{currency:'toman',schemaVersion:2}));
   await assertFails(getDoc(doc(other,path)));await assertFails(setDoc(doc(other,path),{currency:'toman',schemaVersion:2}));
   await assertFails(setDoc(doc(mine,'ledgers/someone-else'),{currency:'toman',schemaVersion:2}));await assertFails(setDoc(doc(mine,'unrelated/customer'),good));
 });
 await test('owner may create valid immutable metadata; no overwrite, delete or collection enumeration',async()=>{
   const mine=env.authenticatedContext(owner).firestore();
   await assertFails(setDoc(doc(mine,path),{currency:'USD',schemaVersion:2}));await assertFails(setDoc(doc(mine,path),{currency:'toman',schemaVersion:2,extra:true}));
   await assertSucceeds(setDoc(doc(mine,path),{currency:'toman',schemaVersion:2}));await assertSucceeds(getDoc(doc(mine,path)));
   await assertFails(setDoc(doc(mine,path),{currency:'rial',schemaVersion:2}));await assertFails(deleteDoc(doc(mine,path)));await assertFails(getDocs(collection(mine,'ledgers')));
 });
 await test('only owner can get/list and write bounded customer documents; no deletes',async()=>{
   const mine=env.authenticatedContext(owner).firestore(),other=env.authenticatedContext('someone-else').firestore(),anon=env.unauthenticatedContext().firestore();const p=path+'/customers/fictional';
   await assertSucceeds(setDoc(doc(mine,p),good));await assertSucceeds(getDoc(doc(mine,p)));await assertSucceeds(getDocs(collection(mine,path+'/customers')));
   await assertFails(getDoc(doc(other,p)));await assertFails(getDocs(collection(other,path+'/customers')));await assertFails(getDoc(doc(anon,p)));
   await assertFails(setDoc(doc(other,p),good));await assertFails(setDoc(doc(anon,p),good));await assertFails(deleteDoc(doc(mine,p)));
   await assertFails(setDoc(doc(mine,p),{payload:15,operation:'op'}));await assertFails(setDoc(doc(mine,p),{...good,extra:'unexpected'}));await assertFails(setDoc(doc(mine,p),{payload:'x'.repeat(700001),operation:'op'}));
   await assertFails(setDoc(doc(mine,p),{payload:'{}',operation:''}));await assertSucceeds(setDoc(doc(mine,p),{payload:'{"updated":true}',operation:'update'}));
 });
 await test('real Firestore REST transport: two persisted devices, offline merge, preconditions and readbacks',async()=>{
   await env.clearFirestore();
   // Test-only admin transport exercises REST wire semantics, independently
   // from the UID-scoped authorization tests above. It cannot reach production.
   const host=process.env.FIRESTORE_EMULATOR_HOST;
   assert.match(host,/^(127\.0\.0\.1|localhost):8080$/);
   const fetcher=async(url,options)=>{
     assert.ok(url.startsWith('https://firestore.googleapis.com/v1/projects/demo-daftar/'));
     const response=await fetch(url.replace('https://firestore.googleapis.com','http://'+host),options);
     return response;
   };
   const device=initial=>{
     let local=structuredClone(initial),chain=Promise.resolve();
     const remote=new FirebaseRest({fetcher,storage:{getItem:()=>null},config:{projectId:'demo-daftar'},owner});
     remote.token=async()=> 'owner';
     const engine=new LedgerSync({remote,read:()=>structuredClone(local),write:n=>{local=structuredClone(n);},online:()=>true,lock:fn=>{const p=chain.then(fn);chain=p.catch(()=>{});return p;}});
     return {engine,remote,get data(){return structuredClone(local);},edit(fn){const before=structuredClone(local),next=structuredClone(local);fn(next);local=queueChanges(before,next);}};
   };
   const initial={...emptyLedger('toman'),customers:[{id:'fictional',name:'آزمایش',phone:'',notes:'',policies:[makePolicy({title:'بیمه',number:'1',total:'1000000',down:'0',paymentDate:'1405/01/01',firstDate:'1405/02/15',count:'3',frequency:'monthly'})]}]};
   const a=device(initial),b=device(emptyLedger('toman'));
   await a.engine.connect(await a.engine.preview());assert.equal(a.engine.status,'confirmed');
   await b.engine.connect(await b.engine.preview());assert.deepEqual(a.data.customers,b.data.customers);
   const pay=(d,id)=>d.edit(l=>{l.customers[0].policies[0]=recordPayment(l.customers[0].policies[0],{id,amount:'100000',date:'1405/01/02',note:''});});
   pay(a,'A');pay(b,'B');await a.engine.run({full:false});await b.engine.run({full:false});await a.engine.run();
   assert.equal(a.engine.status,'confirmed');assert.equal(b.engine.status,'confirmed');assert.deepEqual(a.data.customers,b.data.customers);assert.equal(policySummary(a.data.customers[0].policies[0]).paid,200000);
   const old=await a.remote.get('fictional','toman');pay(a,'C');await a.engine.run({full:false});
   await assert.rejects(a.remote.put(old.value,old.updateTime,'stale'),e=>e.code==='FAILED_PRECONDITION'||[409,412].includes(e.status));
   const writes=a.remote.writes;await a.engine.run();assert.equal(a.remote.writes,writes);assert.equal(policySummary(a.data.customers[0].policies[0]).paid,300000);
 });
} finally {await env.cleanup();}
