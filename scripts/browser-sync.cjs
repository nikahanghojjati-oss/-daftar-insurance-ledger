const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const root=path.resolve(__dirname,'..');
const out=path.resolve(process.env.BROWSER_EVIDENCE_DIR||path.join(root,'browser-evidence'));
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const server=http.createServer(async(req,res)=>{
  try{
   const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   const file=path.resolve(root,'dist','.'+(name==='/'?'/index.html':name));
   if(!file.startsWith(path.join(root,'dist')+path.sep)){res.writeHead(403);return res.end();}
   const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.woff2':'font/woff2'};
   res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
   res.end(await fs.readFile(file));
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port+'/';
 const core=await import(root+'/dist/core.js');
 const model=await import(root+'/dist/sync-model.js');
 const {LEDGER_UID,LEDGER_AUTH_UIDS}=await import(root+'/dist/firebase-config.js');
 const customer={id:'browser-customer',name:'مشتری آزمایشی',phone:'',notes:'',policies:[core.makePolicy({title:'بیمه آزمایشی',number:'TEST',total:'1000000',down:'0',paymentDate:'1405/01/01',firstDate:'1405/02/15',count:'3',frequency:'monthly'})]};
 const initial=model.initializeCloud({...core.emptyLedger('toman'),customers:[customer],revision:'initial-business',updatedAt:'2026-11-07T10:00:00Z'},LEDGER_UID);
 let remote=structuredClone(customer),version=1,puts=0,refreshes=0,signins=0;
 const versionTime=()=>`2026-11-07T12:00:${String(version).padStart(2,'0')}Z`;
 const document=()=>({name:`projects/mock/databases/(default)/documents/ledgers/${LEDGER_UID}/customers/${customer.id}`,fields:{payload:{stringValue:JSON.stringify(remote)},operation:{stringValue:'browser-test'}},updateTime:versionTime()});
 const browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),headless:true,args:['--no-sandbox']});
 const errors=[];
 const context=async(authUid,seedSession)=>{
  const c=await browser.newContext({viewport:{width:360,height:660},acceptDownloads:true});
  await c.route('https://identitytoolkit.googleapis.com/**',route=>{
   signins++;
   return route.fulfill({status:200,json:{localId:authUid,idToken:'mock-'+authUid,refreshToken:'mock-refresh',expiresIn:'0'}});
  });
  await c.route('https://firestore.googleapis.com/**',async route=>{
   const req=route.request(),url=new URL(req.url());let body;
   assert.equal(req.headers().authorization,'Bearer mock-refreshed-'+authUid);
   if(req.method()==='POST'){
    const w=req.postDataJSON().writes[0];
    assert.ok(w.update.name.includes('/ledgers/'+LEDGER_UID+'/customers/'));
    if(w.currentDocument.updateTime!==versionTime())return route.fulfill({status:412,json:{error:{status:'FAILED_PRECONDITION'}}});
    remote=JSON.parse(w.update.fields.payload.stringValue);version++;puts++;body={commitTime:versionTime()};
   }else if(url.pathname.endsWith('/customers')){assert.ok(url.pathname.includes('/ledgers/'+LEDGER_UID+'/'));body={documents:[document()]};}
   else if(url.pathname.endsWith('/'+customer.id))body=document();
   else body={fields:{schemaVersion:{integerValue:'2'},currency:{stringValue:'toman'}},updateTime:'2026-11-07T10:00:00Z'};
   await route.fulfill({status:200,json:body});
  });
  await c.route('https://securetoken.googleapis.com/**',route=>{refreshes++;return route.fulfill({status:200,json:{user_id:authUid,id_token:'mock-refreshed-'+authUid,refresh_token:'mock-refresh',expires_in:'3600'}});});
  await c.addInitScript(({initial,owner,seedSession})=>{
   if(!localStorage.getItem('daftar.ledger.v1')){
    localStorage.setItem('daftar.ledger.v1',JSON.stringify(initial));localStorage.setItem('daftar.mode.v1','own');
    if(seedSession)localStorage.setItem('daftar.firebase.session.v1',JSON.stringify({owner,idToken:'mock-expired',refreshToken:'mock-refresh',expiresAt:0}));
   }
  },{initial,owner:LEDGER_UID,seedSession});
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base);
  if(!seedSession){
   await p.locator('.mobile-nav [data-view="backup"]').click();
   await p.locator('[data-action="cloud-login"]').click();
   await p.locator('#cloud-login-form [name="email"]').fill('dad@example.invalid');
   await p.locator('#cloud-login-form [name="password"]').fill('fictional-password');
   await p.locator('#cloud-login-form button[type="submit"]').click();
  }
  await p.waitForFunction(()=>JSON.parse(localStorage.getItem('daftar.ledger.v1')).cloud.confirmedAt);
  return {c,p};
 };
 const read=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('daftar.ledger.v1')));
 const nav=async(p,view)=>p.locator(`.mobile-nav [data-view="${view}"]`).click();
 const sync=async p=>{
  const prior=(await read(p)).cloud.confirmedAt;
  await p.locator('[data-action="cloud-sync"]').click();
  await p.waitForFunction(prior=>JSON.parse(localStorage.getItem('daftar.ledger.v1')).cloud.confirmedAt!==prior,prior);
 };
 const pay=async(p,value)=>{
  await nav(p,'customers');await p.locator('.customer-name').click();await p.locator('[data-action="pay"]').click();
  await p.locator('#payment-form [name="amount"]').fill(value);
  await p.locator('#payment-form button[type="submit"]').click();
  await p.waitForFunction(()=>!document.querySelector('#dialog').open);
 };
 const a=await context(LEDGER_UID,true),b=await context(LEDGER_AUTH_UIDS.find(uid=>uid!==LEDGER_UID),false);
 assert.equal(signins,1);
 assert.equal(await b.p.evaluate(()=>JSON.parse(localStorage.getItem('daftar.firebase.session.v1')).owner),LEDGER_UID);
 await nav(a.p,'backup');await nav(b.p,'backup');
 assert.equal(await a.p.locator('.cloud-status').count(),1);
 assert.equal(await a.p.locator('[data-action="cloud-settings"]').count(),0);
 assert.equal(await a.p.locator('.cloud-help').evaluate(e=>e.open),false);
 const download=a.p.waitForEvent('download');await a.p.locator('.backup-card [data-action="export"]').click();
 const d=await download;await d.saveAs(out+'/fictional-backup.json');
 const backed=await a.p.evaluate(()=>localStorage.getItem('daftar.backup-revision.own'));
 await sync(a.p);assert.equal((await read(a.p)).revision,backed);
 assert.match(await a.p.locator('.save-strip').innerText(),/فایل آخرین تغییرات آماده شده/);
 await a.p.screenshot({path:out+'/backup-mobile.png',fullPage:true});
 await pay(a.p,'100000');
 await a.p.waitForFunction(()=>Object.keys(JSON.parse(localStorage.getItem('daftar.ledger.v1')).cloud.pending).length===0);
 await sync(b.p);assert.equal(core.policySummary((await read(b.p)).customers[0].policies[0]).paid,100000);
 await a.p.reload();await a.p.waitForFunction(()=>document.querySelector('#app').textContent.includes('دفتر'));
 assert.equal(await a.p.locator('#cloud-login-form').count(),0);
 assert.equal(await a.p.evaluate(()=>JSON.parse(localStorage.getItem('daftar.firebase.session.v1')).idToken),'mock-refreshed-'+LEDGER_UID);
 await b.p.waitForFunction(()=>document.querySelector('#connection').textContent.includes('آماده استفاده آفلاین'));
 await b.c.setOffline(true);await pay(b.p,'200000');
 assert.ok(Object.keys((await read(b.p)).cloud.pending).length>0);
 await b.p.reload();await b.p.waitForFunction(()=>document.querySelector('#app').textContent.includes('دفتر'));
 assert.equal(core.policySummary((await read(b.p)).customers[0].policies[0]).paid,300000);
 await b.c.setOffline(false);await nav(b.p,'backup');await sync(b.p);
 await nav(a.p,'backup');await sync(a.p);
 const finalA=await read(a.p),finalB=await read(b.p);
 assert.deepEqual(finalA.customers,finalB.customers);
 assert.equal(core.policySummary(finalA.customers[0].policies[0]).paid,300000);
 assert.equal(finalA.customers[0].policies[0].payments.length,2);
 assert.notEqual(finalA.revision,backed);assert.equal(puts,2);
 const layouts=[];
 for(const size of [{width:360,height:660},{width:360,height:480},{width:1280,height:900}]){
  await a.p.setViewportSize(size);const metric=await a.p.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(metric.scroll<=metric.viewport,JSON.stringify(metric));layouts.push({...size,...metric});
 }
 await a.p.screenshot({path:out+'/backup-desktop.png',fullPage:true});
 assert.deepEqual(errors,[]);
 const result={result:'PASS',transport:'intercepted Firebase REST; no production login or writes',contexts:2,signins,puts,refreshes,paid:300000,receipts:2,layouts,checks:['two distinct authorized accounts share the original ledger','dad sign-in through the actual form','legacy owner session retained','backup freshness after no-change sync','online payment exchange','expired-token renewal','access retained after reload','offline payment survives offline reload','reconnect convergence with stable receipts','single sync message on backup screen','no horizontal overflow'],limits:['physical Safari/Galaxy A20 and real-account two-device production acceptance NOT CHECKED']};
 await fs.writeFile(out+'/browser-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close();await new Promise(resolve=>server.close(resolve));
})().catch(e=>{console.error(e);process.exit(1)});

