import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyLedger,makePolicy,recordPayment,voidPayment,restorePayment,validateLedger,policySummary} from '../dist/core.js';
import {initializeCloud,queueChanges,reconcile,mergeCustomer,resolveConflict,backupLedger,equal} from '../dist/sync-model.js';
import {LedgerSync} from '../dist/sync.js';
import {FirebaseRest,CloudError} from '../dist/firebase-rest.js';
import {LEDGER_UID} from '../dist/firebase-config.js';
const cp=structuredClone;
function customer(id='c1') {return {id,name:'مشتری آزمایشی',phone:'',notes:'',policies:[makePolicy({title:'بیمه',number:'1',total:'1000000',down:'0',paymentDate:'1405/01/01',firstDate:'1405/02/15',count:'3',frequency:'monthly'})]};}
function ledger(){return {...emptyLedger('toman'),customers:[customer()]};}
function receipt(c,id,amount='100000') {const n=cp(c);n.policies[0]=recordPayment(n.policies[0],{id,amount,date:'1405/01/02',note:''});return n;}
class Remote {
 constructor(data=null){this.currency=data?.currency;this.docs=new Map();this.version=0;this.puts=0;this.reads=0;this.fail=false;this.loseResponse=false;if(data)for(const c of data.customers)this.seed(c);}
 seed(c){this.docs.set(c.id,{value:cp(c),updateTime:'v'+(++this.version)});}
 async meta(){if(this.fail)throw new TypeError('offline');return this.currency?{currency:this.currency,updateTime:'meta'}:null;}
 async createMeta(currency){if(this.currency)throw new CloudError(409,'ALREADY_EXISTS');this.currency=currency;}
 async list(){this.reads++;return [...this.docs.values()].map(v=>cp(v));}
 async put(c,version){if(this.fail)throw new TypeError('offline');const actual=this.docs.get(c.id)?.updateTime;if(actual!==version)throw new CloudError(412,'FAILED_PRECONDITION');this.puts++;this.seed(c);if(this.loseResponse){this.loseResponse=false;throw new TypeError('connection lost after commit');}}
 async get(id){this.reads++;if(!this.docs.has(id))throw new CloudError(404,'NOT_FOUND');return cp(this.docs.get(id));}
}
function device(remote,data=emptyLedger('toman')){let local=cp(data);let writes=0;let chain=Promise.resolve();const lock=fn=>{const p=chain.then(fn);chain=p.catch(()=>{});return p;};const engine=new LedgerSync({remote,read:()=>cp(local),write:n=>{local=cp(n);writes++;},lock,online:()=>!remote.fail});return {engine,get data(){return cp(local);},set data(n){local=cp(n);},mutate(fn){const before=cp(local),next=cp(local);fn(next);local=queueChanges(before,next);},get writes(){return writes;}};}
async function connect(d){const p=await d.engine.preview();await d.engine.connect(p);}

test('two devices: backup-first explicit initial upload, second device downloads, receipts converge',async()=>{
 const remote=new Remote(), a=device(remote,ledger());await connect(a);
 assert.equal(a.engine.status,'confirmed');assert.equal(remote.puts,1);
 const b=device(remote);await connect(b);assert.deepEqual(b.data.customers,a.data.customers);
 a.mutate(l=>l.customers[0]=receipt(l.customers[0],'payment-A'));await a.engine.run();await b.engine.run();
 assert.equal(policySummary(b.data.customers[0].policies[0]).paid,100000);
 assert.equal(remote.puts,2);
});
test('offline independent receipts merge without duplicates across both devices',async()=>{
 const initial=ledger(),remote=new Remote(initial),a=device(remote,initial),b=device(remote,initial);await connect(a);await connect(b);
 remote.fail=true;a.mutate(l=>l.customers[0]=receipt(l.customers[0],'A'));b.mutate(l=>l.customers[0]=receipt(l.customers[0],'B'));await a.engine.run();
 assert.equal(a.engine.status,'offline');assert.ok(a.data.cloud.pending.c1);
 remote.fail=false;await a.engine.run();await b.engine.run();await a.engine.run();
 assert.equal(a.data.customers[0].policies[0].payments.length,2);assert.equal(policySummary(a.data.customers[0].policies[0]).paid,200000);
 assert.deepEqual(a.data.customers,b.data.customers);await b.engine.run();assert.equal(remote.puts,2);
});
test('same name edits require review; originals survive resolution and backup',async()=>{
 const initial=ledger(),remote=new Remote(initial),a=device(remote,initial),b=device(remote,initial);await connect(a);await connect(b);
 a.mutate(l=>l.customers[0].name='نام الف');b.mutate(l=>l.customers[0].name='نام ب');await a.engine.run();await b.engine.run();
 assert.equal(b.engine.status,'conflict');assert.equal(b.data.cloud.conflicts.c1.local.name,'نام ب');assert.equal(b.data.cloud.conflicts.c1.remote.name,'نام الف');
 await b.engine.resolve('c1','local');assert.equal(b.engine.status,'confirmed');assert.equal(remote.docs.get('c1').value.name,'نام ب');
 assert.equal(b.data.cloud.resolutions.length,1);assert.ok(backupLedger(b.data).syncResolutionHistory);
});
test('concurrent separate fields and separate customer additions merge',()=>{
 const base=customer(),a=cp(base),b=cp(base);a.name='الف';b.phone='123';const result=mergeCustomer(base,a,b,'toman');assert.deepEqual(result.conflicts,[]);assert.equal(result.value.name,'الف');assert.equal(result.value.phone,'123');
 let l=initializeCloud({...emptyLedger('toman'),customers:[a]},LEDGER_UID);l=reconcile(l,[{value:customer('c2'),updateTime:'v1'}]);assert.equal(l.customers.length,2);assert.ok(l.cloud.pending.c1);
});
test('merged overpayment blocks upload rather than losing either offline receipt',async()=>{
 const initial=ledger(),remote=new Remote(initial),a=device(remote,initial),b=device(remote,initial);await connect(a);await connect(b);
 a.mutate(l=>l.customers[0]=receipt(l.customers[0],'A','600000'));b.mutate(l=>l.customers[0]=receipt(l.customers[0],'B','600000'));await a.engine.run();await b.engine.run();
 assert.equal(b.engine.status,'conflict');assert.equal(remote.puts,1);assert.equal(b.data.cloud.conflicts.c1.local.policies[0].payments[0].id,'B');assert.equal(b.data.cloud.conflicts.c1.remote.policies[0].payments[0].id,'A');
});
test('lost write response, closure, persisted queue and retry cannot duplicate a receipt',async()=>{
 const initial=ledger(),remote=new Remote(initial),a=device(remote,initial);await connect(a);
 a.mutate(l=>l.customers[0]=receipt(l.customers[0],'once'));remote.loseResponse=true;await a.engine.run();assert.equal(a.engine.status,'error');assert.ok(a.data.cloud.pending.c1);
 const reopened=device(remote,JSON.parse(JSON.stringify(a.data)));await reopened.engine.run();assert.equal(reopened.engine.status,'confirmed');assert.equal(remote.puts,1);assert.equal(remote.docs.get('c1').value.policies[0].payments.length,1);
});
test('stale compare-and-set rereads and merges a competing write',async()=>{
 const initial=ledger(),remote=new Remote(initial),a=device(remote,initial);await connect(a);a.mutate(l=>l.customers[0]=receipt(l.customers[0],'A'));
 const original=remote.put.bind(remote);let once=true;remote.put=async(c,v)=>{if(once){once=false;remote.seed(receipt(remote.docs.get('c1').value,'B'));}return original(c,v);};
 await a.engine.run();assert.equal(a.engine.status,'confirmed');assert.equal(a.data.customers[0].policies[0].payments.length,2);
});
test('a local edit while network upload is in flight remains durable and is uploaded',async()=>{
 const initial=ledger(),remote=new Remote(initial),a=device(remote,initial);await connect(a);a.mutate(l=>l.customers[0]=receipt(l.customers[0],'A'));
 const original=remote.put.bind(remote);let once=true;remote.put=async(c,v)=>{const result=await original(c,v);if(once){once=false;a.mutate(l=>l.customers[0]=receipt(l.customers[0],'B'));}return result;};
 await a.engine.run();assert.equal(a.engine.status,'confirmed');assert.equal(remote.docs.get('c1').value.policies[0].payments.length,2);assert.equal(remote.puts,2);
});
test('cancel and restore retain original receipt and correction history on both devices',async()=>{
 const initial=ledger();initial.customers[0]=receipt(initial.customers[0],'A');const remote=new Remote(initial),a=device(remote,initial),b=device(remote);await connect(a);await connect(b);
 a.mutate(l=>{l.customers[0].policies[0]=voidPayment(l.customers[0].policies[0],'A');});await a.engine.run();await b.engine.run();assert.equal(policySummary(b.data.customers[0].policies[0]).paid,0);
 b.mutate(l=>{l.customers[0].policies[0]=restorePayment(l.customers[0].policies[0],'A');});await b.engine.run();await a.engine.run();assert.equal(policySummary(a.data.customers[0].policies[0]).paid,100000);assert.equal(a.data.customers[0].policies[0].payments[0].revisions.length,2);
});
test('join preview detects either version changing and never replaces nonempty local data',async()=>{
 const initial=ledger(),remote=new Remote(initial),a=device(remote,{...emptyLedger('toman'),customers:[customer('local')]});const p=await a.engine.preview();remote.seed(customer('later'));
 await assert.rejects(a.engine.connect(p),/تغییر/);assert.equal(a.data.customers[0].id,'local');assert.equal(a.data.cloud,undefined);
 await connect(a);assert.equal(a.data.customers.length,3);
});
test('joining different currencies and changing currency or replacing linked data is refused',async()=>{
 const initial=ledger(),remote=new Remote(initial),a=device(remote,{...ledger(),currency:'rial'});await assert.rejects(connect(a),/واحد پول/);assert.equal(a.data.cloud,undefined);
 const linked=initializeCloud(initial,LEDGER_UID);assert.throws(()=>queueChanges(linked,{...linked,currency:'rial'}));assert.throws(()=>queueChanges(linked,{...linked,customers:[]}));
});
test('conflict remains stable after rereads, and latest server changes are rechecked after resolution',async()=>{
 const initial=ledger(),remote=new Remote(initial),a=device(remote,initial);await connect(a);a.mutate(l=>l.customers[0].name='local');let r=cp(initial.customers[0]);r.name='remote';remote.seed(r);await a.engine.run();const conflict=cp(a.data.cloud.conflicts.c1);r.name='new remote';remote.seed(r);await a.engine.run();assert.deepEqual(a.data.cloud.conflicts.c1,conflict);
 await a.engine.resolve('c1','local');assert.equal(a.engine.status,'conflict');assert.equal(a.data.cloud.conflicts.c1.remote.name,'new remote');
});
test('server readback failure never claims confirmation',async()=>{
 const initial=ledger(),remote=new Remote(initial),a=device(remote,initial);await connect(a);a.mutate(l=>l.customers[0]=receipt(l.customers[0],'A'));remote.get=async()=>{throw new TypeError('offline');};await a.engine.run();assert.equal(a.engine.status,'error');assert.ok(a.data.cloud.pending.c1);
});
test('backup omits device queue and tokens; pending/conflict originals are portable',()=>{
 const l=initializeCloud(ledger(),LEDGER_UID);l.cloud.conflicts.c1={local:l.customers[0],remote:customer()};const b=backupLedger(l);assert.equal(b.cloud,undefined);assert.ok(b.unresolvedSyncConflicts.c1);validateLedger(b);
});
test('REST authentication persists refresh access, never password; wrong account refused',async()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};let request;
 const remote=new FirebaseRest({storage,fetcher:async(url,options)=>{request={url,options};return Response.json({localId:LEDGER_UID,idToken:'token',refreshToken:'refresh',expiresIn:'3600'});}});
 await remote.signIn('fictional@example.com','private-secret');assert.ok(request.options.body.includes('private-secret'));assert.ok(![...map.values()].join('').includes('private-secret'));assert.equal(await remote.token(),'token');
 const wrong=new FirebaseRest({storage,fetcher:async()=>Response.json({localId:'different'})});await assert.rejects(wrong.signIn('other@example.com','other'),e=>e.code==='WRONG_LEDGER_ACCOUNT');
});
test('REST refreshes an expired session, honors page tokens, and sends server preconditions',async()=>{
 const map=new Map([['daftar.firebase.session.v1',JSON.stringify({owner:LEDGER_UID,refreshToken:'refresh',expiresAt:0})]]),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
 const c=customer(),calls=[];const remote=new FirebaseRest({storage,fetcher:async(url,options)=>{calls.push({url,options});if(url.includes('securetoken'))return Response.json({user_id:LEDGER_UID,id_token:'new-token',refresh_token:'new-refresh',expires_in:'3600'});if(options.method==='POST' && url.endsWith(':commit'))return Response.json({});return Response.json({documents:[{name:'projects/p/databases/(default)/documents/ledgers/u/customers/'+c.id,fields:{payload:{stringValue:JSON.stringify(c)}},updateTime:'time'}],...(!url.includes('pageToken')?{nextPageToken:'second'}:{})});}});
 assert.equal(await remote.token(),'new-token');const docs=await remote.list('toman');assert.equal(docs.length,2);assert.ok(calls.some(c=>c.url.includes('pageToken=second')));await remote.put(c,'time','op');assert.ok(calls.at(-1).url.endsWith('/documents:commit'));assert.equal(JSON.parse(calls.at(-1).options.body).writes[0].currentDocument.updateTime,'time');assert.equal(calls.at(-1).options.headers.Authorization,'Bearer new-token');
});

test('incremental save reads only pending customers and preserves untouched baseline documents',async()=>{
 const initial=ledger();initial.customers.push(customer('c2'));const remote=new Remote(initial),a=device(remote,initial);await connect(a);
 let lists=0;const list=remote.list.bind(remote);remote.list=async()=>{lists++;return list();};
 a.mutate(l=>l.customers[0]=receipt(l.customers[0],'A'));await a.engine.run({full:false});assert.equal(lists,0);assert.equal(a.data.customers.length,2);assert.equal(a.engine.status,'confirmed');
 a.mutate(l=>l.customers.push(customer('c3')));await a.engine.run({full:false});assert.equal(remote.docs.size,3);assert.equal(a.engine.status,'confirmed');
});
test('Firestore HTTP 400 FAILED_PRECONDITION rereads rather than abandoning pending money',async()=>{
 const initial=ledger(),remote=new Remote(initial),a=device(remote,initial);await connect(a);a.mutate(l=>l.customers[0]=receipt(l.customers[0],'A'));
 const put=remote.put.bind(remote);let once=true;remote.put=async(c,v)=>{if(once){once=false;remote.seed(receipt(remote.docs.get('c1').value,'B'));throw new CloudError(400,'FAILED_PRECONDITION');}return put(c,v);};
 await a.engine.run();assert.equal(a.engine.status,'confirmed');assert.equal(a.data.customers[0].policies[0].payments.length,2);
});
