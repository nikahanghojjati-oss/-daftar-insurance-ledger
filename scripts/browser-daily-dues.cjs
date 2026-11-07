// Fictional, device-local records only. No Firebase account or production data.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.BROWSER_EVIDENCE_DIR||path.join(root,'browser-evidence'));
(async()=>{
 const core=await import(root+'/dist/core.js');
 const day='2026-11-07',fixed=new Date(day+'T20:29:40Z'); // 23:59:40 in Tehran.
 const ledger=core.emptyLedger('toman');
 function customer(id,name,date,total,paid=0){
  let policy=core.makePolicy({title:'بیمه آزمایشی',number:id,total:String(total),down:'0',count:'1',frequency:'monthly',paymentDate:core.dateInput(core.addDays(day,-30)),firstDate:core.dateInput(date)});
  if(paid)policy=core.recordPayment(policy,{amount:String(paid),date:core.dateInput(day)},day);
  return {id,name,phone:'',notes:'',policies:[policy]};
 }
 ledger.customers=[
  ...Array.from({length:5},(_,n)=>customer('old-'+n,'عقب‌افتاده آزمایشی '+core.fa(n+1),core.addDays(day,-n-1),100000)),
  customer('today-partial','امروز با پرداخت بخشی',day,1000000,400000),
  customer('today-open','امروز بدون پرداخت',day,200000),
  customer('tomorrow-open','فردا بدون پرداخت',core.addDays(day,1),1200000),
  customer('tomorrow-paid','فردا تسویه‌شده',core.addDays(day,1),500000,500000),
  customer('later','سررسید دورتر',core.addDays(day,4),300000)
 ];
 core.validateLedger(ledger);
 const server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'dist','.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
   if(!file.startsWith(path.join(root,'dist')+path.sep)){res.writeHead(403);return res.end();}
   const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.woff2':'font/woff2'};
   res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
   res.end(await fs.readFile(file));
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  await fs.mkdir(out,{recursive:true});
  browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:360,height:660}}),errors=[];
  await context.route('https://*.googleapis.com/**',route=>{errors.push('Unexpected Google request');return route.abort();});
  await context.route('**/index.html?__daftar_clock=*',route=>route.fulfill({status:200,headers:{date:fixed.toUTCString()}}));
  await context.addInitScript(seed=>{if(!localStorage.getItem('daftar.ledger.v1')){localStorage.setItem('daftar.ledger.v1',JSON.stringify(seed));localStorage.setItem('daftar.mode.v1','own');}},ledger);
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.clock.install({time:fixed});await page.clock.pauseAt(fixed);
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  await page.getByText('تاریخ آنلاین بررسی شد',{exact:true}).waitFor();
  const today=page.locator('.daily-due-today'),tomorrow=page.locator('.daily-due-tomorrow');
  assert.match(await today.innerText(),/۲ قسط/);assert.match(await today.innerText(),/۸۰۰٬۰۰۰/);
  assert.match(await tomorrow.innerText(),/۱ قسط/);assert.match(await tomorrow.innerText(),/۱٬۲۰۰٬۰۰۰/);
  const savedBefore=await page.evaluate(()=>localStorage.getItem('daftar.ledger.v1'));
  for(const [width,height] of [[360,660],[360,480],[390,844],[768,900],[1280,900]]){
   await page.setViewportSize({width,height});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'overflow at '+width);
   const tile=await today.boundingBox(),stats=await page.locator('.stats').boundingBox();
   assert.ok(tile.height>=44&&tile.y+tile.height<=stats.y,'daily totals must precede the account stats');
   assert.equal(await page.locator('.daily-dues').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
   await page.screenshot({path:path.join(out,'daily-dues-'+width+'x'+height+'.png'),fullPage:true});
  }
  await today.click();
  assert.equal(await page.locator('[data-action="due-filter"][data-filter="today"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('.due-list .due-card').count(),2);
  assert.match(await page.locator('.due-list').innerText(),/امروز با پرداخت بخشی/);
  assert.doesNotMatch(await page.locator('.due-list').innerText(),/عقب‌افتاده|فردا|دورتر/);
  await page.locator('[data-action="due-filter"][data-filter="tomorrow"]').click();
  assert.equal(await page.locator('.due-list .due-card').count(),1);
  assert.match(await page.locator('.due-list').innerText(),/فردا بدون پرداخت/);
  await page.locator('.nav-item[data-view="home"]').click();await tomorrow.click();
  assert.equal(await page.locator('[data-action="due-filter"][data-filter="tomorrow"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>localStorage.getItem('daftar.ledger.v1')),savedBefore,'viewing must preserve the ledger');
  // Pay the partial balance through the actual UI, then verify both views agree.
  await page.locator('.nav-item[data-view="home"]').click();await today.click();
  await page.locator('.due-list .due-card[data-id="today-partial"]').click();
  await page.locator('[data-action="pay"]').click();
  await page.locator('#payment-form [name="amount"]').fill('600000');
  await page.locator('#payment-form button[type="submit"]').click();
  await page.locator('.nav-item[data-view="home"]').click();
  assert.match(await today.innerText(),/۱ قسط/);assert.match(await today.innerText(),/۲۰۰٬۰۰۰/);
  await page.reload();assert.match(await today.innerText(),/۲۰۰٬۰۰۰/);
  // The default must be explained relative to issuance, not just called monthly.
  await page.locator('.customer-name[data-id="today-partial"]').click();
  await page.locator('[data-action="add-policy"]').click();
  await page.locator('#policy-form [name="title"]').fill('برنامه شش قسطی آزمایشی');
  await page.locator('#policy-form [name="paymentDate"]').fill('1404/12/05');
  await page.locator('#policy-form [name="total"]').fill('700000');
  await page.locator('#policy-form [name="down"]').fill('100000');
  await page.locator('#policy-form [name="count"]').fill('6');
  for(let n=0;n<6;n++)assert.equal(await page.locator(`[data-installment-offset="${n}"]`).innerText(),core.fa(n+1)+' ماه و ۱۵ روز پس از صدور');
  await page.locator('[data-installment-date="1"]').fill('1405/02/21');
  assert.equal(await page.locator('[data-installment-offset="1"]').innerText(),'۲ ماه و ۱۶ روز پس از صدور');
  await page.locator('[data-installment-date="1"]').fill('1405/02/20');
  await page.locator('#policy-form button[type="submit"]').click();
  await page.getByRole('heading',{name:'برنامه شش قسطی آزمایشی',exact:true}).waitFor();
  assert.deepEqual(await page.locator('.desktop-schedule .schedule-offset').allTextContents(),Array.from({length:6},(_,n)=>core.fa(n+1)+' ماه و ۱۵ روز پس از صدور'));
  assert.doesNotMatch(await page.locator('.policy-title').allTextContents().then(x=>x.join(' ')),/اقساط ماهانه شمسی/);
  await page.setViewportSize({width:360,height:660});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('.policy-card').last().screenshot({path:path.join(out,'six-installment-labels-phone.png')});
  await page.setViewportSize({width:1280,height:900});
  await page.locator('.nav-item[data-view="home"]').click();
  // Crossing Tehran midnight while offline rolls tomorrow into today.
  await context.setOffline(true);await page.clock.fastForward(30000);
  assert.match(await today.innerText(),/۱٬۲۰۰٬۰۰۰/);assert.match(await tomorrow.innerText(),/۰ قسط/);
  await tomorrow.click();assert.equal(await page.locator('.due-list .due-card').count(),0);
  await page.getByRole('heading',{name:'قسطی در این فهرست نیست'}).waitFor();
  const emptyContext=await browser.newContext({viewport:{width:360,height:660}});
  await emptyContext.addInitScript(seed=>{localStorage.setItem('daftar.ledger.v1',JSON.stringify(seed));localStorage.setItem('daftar.mode.v1','own');},core.emptyLedger('rial'));
  const empty=await emptyContext.newPage();await empty.goto('http://127.0.0.1:'+server.address().port+'/');
  assert.equal(await empty.getByText('قسط باز ندارید',{exact:true}).count(),2);
  assert.match(await empty.locator('.daily-dues').innerText(),/ریال/);
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(out,'daily-dues-result.json'),JSON.stringify({passed:true,scenarios:['exact-day totals despite five older dues','partial/paid exclusion','today and tomorrow navigation','viewing preserves records','payment and reload update totals','six installment issuance offsets in form and saved policy','manual date changes update the displayed offset','offline Tehran midnight rollover','empty rial ledger'],widths:[360,390,768,1280]},null,2));
  console.log('Daily dues browser acceptance passed. Fictional records only.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
