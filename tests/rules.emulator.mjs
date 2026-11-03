import test from 'node:test';
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
} finally {await env.cleanup();}
