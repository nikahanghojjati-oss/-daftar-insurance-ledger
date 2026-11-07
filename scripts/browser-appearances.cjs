// Synthetic local ledgers only; appearance never reads production customer data.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),out=path.join(root,'browser-evidence');
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const core=await import(root+'/dist/core.js'),day=core.today(),ledger=core.emptyLedger('toman');
 for(const [id,name,total,when] of [['a','مریم احمدی',400000,day],['b','سارا کریمی',400000,day],['c','رضا محمدی',1200000,core.addDays(day,1)]])ledger.customers.push({id,name,phone:'',notes:'',policies:[core.makePolicy({title:'بیمه شخص ثالث',number:id,total:String(total),down:'0',paymentDate:core.dateInput(core.addDays(day,-45)),firstDate:core.dateInput(when),count:'1',frequency:'monthly'})]});
 const server=http.createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'dist','.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+'/dist/'))throw Error();res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.woff2':'font/woff2','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'})[path.extname(file)]||'text/plain');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/';let browser;
 try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});const context=await browser.newContext({viewport:{width:360,height:780},deviceScaleFactor:1}),errors=[];
 await context.addInitScript(seed=>{if(!localStorage.getItem('daftar.ledger.v1')){localStorage.setItem('daftar.ledger.v1',JSON.stringify(seed));localStorage.setItem('daftar.mode.v1','own');}},ledger);
 await context.route('https://*.googleapis.com/**',route=>{errors.push('Unexpected production network');return route.abort();});
 const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base);await p.waitForFunction(()=>document.fonts.status==='loaded');
 await p.locator('.appearance-settings').click();await p.locator('input[value="desk"]').check();await p.locator('[data-action="home"]').last().click();
 const before=await p.evaluate(()=>localStorage.getItem('daftar.ledger.v1')),layouts=[];
 for(const [index,id] of ['daybook','agenda','desk'].entries()){
  await p.locator('.appearance-settings').click();await p.locator(`input[name="appearance"][value="${id}"]`).check();
  assert.equal(await p.evaluate(()=>localStorage.getItem('daftar.appearance.v1')),id);
  await p.locator('[data-action="home"]').last().click();
  assert.equal(await p.locator('.home-'+id).count(),1);assert.match(await p.locator('.daily-due-today').innerText(),/۸۰۰٬۰۰۰/);assert.match(await p.locator('.daily-due-tomorrow').innerText(),/۱٬۲۰۰٬۰۰۰/);
  for(const [width,height] of [[360,780],[360,660],[360,480],[768,900],[1280,900]]){
   await p.setViewportSize({width,height});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'overflow '+id+' '+width);
   if(width===360)assert.equal(await p.locator('.mobile-nav').evaluate(el=>{const b=el.getBoundingClientRect();return b.bottom<=innerHeight&&b.top>=0}),true);
   layouts.push({id,width,height});
  }
  await p.setViewportSize({width:360,height:780});await p.screenshot({path:out+`/appearance-${index+1}-${id}.png`,fullPage:true});
  await p.reload();await p.locator('.home-'+id).waitFor();assert.equal(await p.evaluate(()=>localStorage.getItem('daftar.ledger.v1')),before);
  await p.locator('.daily-due-today').click();assert.equal(await p.locator('.due-list .due-card').count(),2);await p.locator('.mobile-nav [data-view="home"]').click();
 }
 // Live settings radios support keyboard selection and focus without losing state.
 await p.locator('.appearance-settings').click();await p.locator('input[value="daybook"]').focus();await p.keyboard.press('Space');await p.keyboard.press('ArrowDown');assert.equal(await p.locator('input[value="agenda"]').isChecked(),true);
 await p.screenshot({path:out+'/appearance-settings.png',fullPage:true});await p.locator('[data-action="home"]').last().click();
 // Draft recovery works after choosing another appearance and a reload.
 await p.locator('.home-customers [data-action="add-customer"]').click();await p.locator('#customer-form [name="name"]').fill('فرم ناتمام آزمایشی');await p.reload();
 await p.locator('[data-action="resume-draft"]').first().click();assert.equal(await p.locator('#customer-form [name="name"]').inputValue(),'فرم ناتمام آزمایشی');await p.locator('[data-action="discard-draft"]').click();
 assert.equal(await p.evaluate(()=>localStorage.getItem('daftar.ledger.v1')),before);
 // Record one actual UI receipt after switching; stable receipt survives cached reopen.
 await p.locator('.daily-due-today').click();await p.locator('.due-list .due-card[data-id="a"]').click();await p.locator('[data-action="pay"]').click();await p.locator('#payment-form [name="amount"]').fill('100000');await p.locator('#payment-form button[type="submit"]').click();await p.waitForFunction(()=>!document.querySelector('#dialog').open);
 const receipt=await p.evaluate(()=>JSON.parse(localStorage.getItem('daftar.ledger.v1')).customers[0].policies[0].payments[0]);assert.ok(receipt.id);
 await p.locator('.mobile-nav [data-view="home"]').click();assert.match(await p.locator('.daily-due-today').innerText(),/۷۰۰٬۰۰۰/);
 await p.waitForFunction(()=>document.querySelector('#connection').textContent.includes('آماده استفاده آفلاین'));
 const cdp=await context.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await context.setOffline(true);const launches=[];
 for(let n=0;n<5;n++){const start=Date.now();await p.reload({waitUntil:'domcontentloaded'});await p.locator('.home-agenda').waitFor();launches.push(Date.now()-start);assert.match(await p.locator('.daily-due-today').innerText(),/۷۰۰٬۰۰۰/);}
 assert.ok(Math.max(...launches)<2000,'cached offline meaningful render exceeded 2s: '+launches);
 const restored=await p.evaluate(()=>JSON.parse(localStorage.getItem('daftar.ledger.v1')).customers[0].policies[0].payments[0]);assert.deepEqual(restored,receipt);assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/appearances-result.json',JSON.stringify({passed:true,appearances:3,layouts,ledgerUnchangedByAppearance:true,draftRecovered:true,stableReceipt:receipt.id,cpuThrottle:4,cachedOfflineLaunchMs:launches,consoleErrors:errors,limitations:'Chromium approximation only; actual Galaxy A20 and real-account access NOT CHECKED'},null,2));console.log('Three appearances PASS; cached offline launches (4x CPU): '+launches.join(', ')+' ms');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
