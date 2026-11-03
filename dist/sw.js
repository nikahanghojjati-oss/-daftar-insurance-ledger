const CACHE_VERSION='daftar-shell-v9';
const CACHE_SCOPE=new URL(self.registration.scope).pathname;
const CACHE=CACHE_VERSION+':'+CACHE_SCOPE;
const SHELL=['./','./index.html','./app.js','./core.js','./clock.js','./firebase-config.js','./firebase-rest.js','./sync-model.js','./sync.js','./offline.js','./style.css','./readability.css','./recovery.css','./finance.css','./professional.css','./fonts/Vazirmatn.woff2','./icon.svg','./manifest.webmanifest'];
const absolute=path=>new URL(path,self.registration.scope).href;
async function download(path){
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),15000);
  try{
    const response=await fetch(new Request(absolute(path),{cache:'reload',credentials:'same-origin',signal:abort.signal}));
    const type=response.headers.get('content-type')||'';
    const html=path==='./'||path==='./index.html';
    // Sites canonicalizes /index.html to /. Accept only that same-origin
    // redirect, then verify this is the actual app rather than a login page.
    const destination=response.url?new URL(response.url):null;
    const canonical=html&&destination&&destination.origin===self.location.origin&&destination.pathname===new URL('./',self.registration.scope).pathname;
    if(!response.ok||response.redirected&&!canonical||path.endsWith('.js')&&!/javascript/.test(type)||path.endsWith('.css')&&!type.includes('text/css'))throw new Error(path+' (HTTP '+response.status+', '+type+', redirected: '+response.redirected+')');
    if(html){const text=await response.clone().text();if(!type.includes('text/html')||!text.includes('id="app"')||!text.includes('src="./app.js"'))throw new Error('The response is not the Daftar application');}
    return response;
  }catch(error){
    for(const client of await self.clients.matchAll({includeUncontrolled:true}))client.postMessage({type:'DAFTAR_INSTALL_ERROR',error:path+': '+error.message});
    throw error;
  }finally{clearTimeout(timer);}
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
  // Download the whole new version before touching its cache. The previous
  // working version survives failed updates.
  const responses=await Promise.all(SHELL.map(download));
  const cache=await caches.open(CACHE);
  await Promise.all(SHELL.map((path,i)=>cache.put(absolute(path),responses[i])));
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const name of await caches.keys()) if(name.startsWith('daftar-shell-') && name.endsWith(':'+CACHE_SCOPE) && name!==CACHE)await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('message',event=>{
  if(event.data==='CHECK_READY')event.waitUntil((async()=>{
    const cache=await caches.open(CACHE),keys=await Promise.all(SHELL.map(p=>cache.match(absolute(p))));
    event.ports[0]?.postMessage({ready:keys.every(Boolean),version:CACHE_VERSION,files:keys.filter(Boolean).length});
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||url.searchParams.has('__daftar_clock'))return;
  if(request.mode==='navigate') {
    event.respondWith((async()=>{
      const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),3500);
      try{return await fetch(new Request(request,{signal:abort.signal}));}
      catch{const cache=await caches.open(CACHE);return await cache.match(absolute('./index.html'))||Response.error();}
      finally{clearTimeout(timer);}
    })());return;
  }
  const allowed=SHELL.some(p=>new URL(p,self.registration.scope).pathname===url.pathname);
  if(allowed)event.respondWith((async()=>{
    const cache=await caches.open(CACHE);return await cache.match(url.href,{ignoreSearch:true})||fetch(request);
  })());
});

