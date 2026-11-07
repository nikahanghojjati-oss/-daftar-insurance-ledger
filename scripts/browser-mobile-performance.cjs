// Repeatable mobile approximation, NOT an emulator or calibration of Galaxy A20 hardware.
// All records are fictional. Only a local HTTP server is used.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const zlib=require('node:zlib');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.BROWSER_EVIDENCE_DIR||path.join(root,'browser-evidence'));
const samples=3,profile={viewport:{width:360,height:780},deviceScaleFactor:2,cpuSlowdown:6,network:{latencyMs:150,downloadMbps:1.6,uploadMbps:.75},actualA20Hardware:false,memoryCapEmulated:false};
(async()=>{
 const core=await import(root+'/dist/core.js');
 const cases=[20,100].map(count=>{
  const ledger=core.emptyLedger('toman'),day=core.today();
  for(let n=0;n<count;n++)ledger.customers.push({id:'perf-'+n,name:'مشتری آزمایشی '+core.fa(n+1),phone:'',notes:'',policies:Array.from({length:2},(_,i)=>core.makePolicy({title:'بیمه آزمایشی',total:'6000000',down:'1000000',paymentDate:core.dateInput(core.addDays(day,-50)),firstDate:core.dateInput(core.addDays(day,(n+i)%5-2)),count:'5',frequency:'monthly'}))});
  return {count,ledger:core.validateLedger(ledger)};
 });
 const server=http.createServer(async(req,res)=>{
  try{
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'dist','.'+(pathname==='/'?'/index.html':pathname));
   if(!file.startsWith(path.join(root,'dist')+path.sep)){res.writeHead(403);return res.end();}
   const ext=path.extname(file),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.woff2':'font/woff2'};
   let bytes=await fs.readFile(file);res.setHeader('Content-Type',types[ext]||'application/octet-stream');
   if(['.html','.js','.css','.svg','.webmanifest'].includes(ext)){bytes=zlib.gzipSync(bytes);res.setHeader('Content-Encoding','gzip');res.setHeader('Vary','Accept-Encoding');}
   res.setHeader('Content-Length',bytes.length);res.setHeader('Cache-Control','no-cache');res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port+'/',results=[],errors=[];let browser;
 try{
  await fs.mkdir(out,{recursive:true});
  browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),headless:true,args:['--no-sandbox']});
  for(const {count,ledger} of cases){
   const context=await browser.newContext({viewport:profile.viewport,deviceScaleFactor:2,isMobile:true,hasTouch:true});
   await context.route('https://*.googleapis.com/**',route=>{errors.push('Unexpected Google request');return route.abort();});
   await context.addInitScript(seed=>{
    if(!localStorage.getItem('daftar.ledger.v1')){localStorage.setItem('daftar.ledger.v1',JSON.stringify(seed));localStorage.setItem('daftar.mode.v1','own');}
    window.__mobilePerf={readyMs:null,firstPaintMs:null,longTasks:[]};
    new PerformanceObserver(list=>{for(const entry of list.getEntries())if(entry.name==='first-contentful-paint')window.__mobilePerf.firstPaintMs=entry.startTime;}).observe({type:'paint',buffered:true});
    new PerformanceObserver(list=>{for(const e of list.getEntries())window.__mobilePerf.longTasks.push({start:e.startTime,duration:e.duration});}).observe({type:'longtask',buffered:true});
    const observer=new MutationObserver(()=>{if(!document.querySelector('.daily-due-today')||!document.querySelector('.daily-due-tomorrow'))return;observer.disconnect();requestAnimationFrame(()=>requestAnimationFrame(()=>window.__mobilePerf.readyMs=performance.now()));});
    observer.observe(document,{childList:true,subtree:true});
   },ledger);
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   const cdp=await context.newCDPSession(page);
   await cdp.send('Emulation.setCPUThrottlingRate',{rate:profile.cpuSlowdown});
   await cdp.send('Network.enable');
   await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:profile.network.latencyMs,downloadThroughput:profile.network.downloadMbps*1000000/8,uploadThroughput:profile.network.uploadMbps*1000000/8});
   for(const state of ['cold-online','cached-online','cached-offline']){
    if(state==='cached-offline')await cdp.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
    for(let n=0;n<samples;n++){
     if(state==='cold-online'){
      await cdp.send('Network.clearBrowserCache');
      await cdp.send('Storage.clearDataForOrigin',{origin:new URL(base).origin,storageTypes:'service_workers,cache_storage'});
     }
     await page.goto(base,{waitUntil:'domcontentloaded'});
     await page.waitForFunction(()=>window.__mobilePerf?.readyMs!==null);
     const metric=await page.evaluate(()=>({readyMs:window.__mobilePerf.readyMs,firstPaintMs:performance.getEntriesByName('first-contentful-paint')[0]?.startTime??window.__mobilePerf.firstPaintMs,jsHeapUsedBytes:performance.memory?.usedJSHeapSize??null,longTasks:window.__mobilePerf.longTasks,overflow:document.documentElement.scrollWidth>innerWidth}));
     assert.equal(metric.overflow,false);
     const start=await page.evaluate(()=>performance.now());
     await page.locator('.daily-due-today').tap();
     await page.locator('[data-action="due-filter"][data-filter="today"][aria-pressed="true"]').waitFor();
     const interactionMs=await page.evaluate(()=>performance.now())-start;
     results.push({customers:count,state,sample:n+1,...metric,dayNavigationMs:interactionMs});
     await page.locator('.mobile-nav [data-view="home"]').tap();
     if(state!=='cached-offline')await page.waitForFunction(()=>document.querySelector('#connection')?.textContent.includes('آماده استفاده آفلاین'),null,{timeout:60000});
    }
    if(state==='cold-online'){
     await page.screenshot({path:path.join(out,'mobile-current-home-'+count+'-customers.png')});
    }
   }
   await page.setViewportSize({width:360,height:660});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await context.close();
  }
  const summaries=[];
  for(const {count} of cases)for(const state of ['cold-online','cached-online','cached-offline']){
   const values=results.filter(x=>x.customers===count&&x.state===state).map(x=>x.readyMs).sort((a,b)=>a-b);
   const median=values[Math.floor(values.length/2)];summaries.push({customers:count,state,samples:values.length,medianReadyMs:Math.round(median),maxReadyMs:Math.round(values.at(-1)),medianUnderOneSecond:median<1000});
  }
  assert.deepEqual(errors,[]);
  const report={profile,browserVersion:browser.version(),notes:['Uncalibrated relative 6x CPU slowdown on this CI runner; not Exynos/A20 hardware.','No Android OS, GPU, memory-bandwidth, thermal, low-RAM eviction or Samsung Internet emulation.','DPR 2 / 360 CSS pixels is a test assumption, not an observed phone configuration.','Gzipped local server with artificial network limits; production DNS/TLS/hosting latency not measured.','Ready means Home buttons mounted and two animation frames elapsed; fonts, online sync and offline installation can complete later.','Seeded local data only; network synchronization is excluded.','Navigation timing includes automation dispatch and is diagnostic, not an INP metric.','Performance is reported as a baseline, not a passing one-second guarantee.'],summaries,results};
  await fs.writeFile(path.join(out,'mobile-performance.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({profile,summaries},null,2));
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
