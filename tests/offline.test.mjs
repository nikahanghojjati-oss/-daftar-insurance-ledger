import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
function harness({redirect=null,login=false,origin='https://daftar.test/'}={}){
  const listeners={},cache=new Map();let offline=false,auth=false,claimed=false;
  const resolve=r=>new URL(typeof r==='string'?r:r.url,origin).href;
  const api={match:async r=>cache.get(resolve(r))?.clone(),put:async(r,response)=>cache.set(resolve(r),response.clone())};
  const context={URL,Request,Response,AbortController,setTimeout,clearTimeout,console,caches:{open:async()=>api,keys:async()=>['daftar-shell-v5'],delete:async()=>true},fetch:async req=>{
    if(offline)throw new TypeError('offline');if(auth)return new Response('Sign in',{status:401});const url=resolve(req),path=new URL(url).pathname;
    const response=new Response(path.endsWith('.js')?'/* script */':login?'<!doctype html><html>Sign in</html>':'<!doctype html><html lang="fa"><div id="app">دفتر</div><script src="./app.js"></script></html>',{headers:{'content-type':path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html'}});if(redirect&&path.endsWith('/index.html')){Object.defineProperty(response,'redirected',{value:true});Object.defineProperty(response,'url',{value:new URL(redirect,origin).href});}return response;
  },self:{registration:{scope:origin},location:{origin:new URL(origin).origin},clients:{matchAll:async()=>[],claim:async()=>{claimed=true;}},skipWaiting:async()=>{},addEventListener:(type,fn)=>listeners[type]=fn}};
  const wait=async(type)=>{let promise;listeners[type]({waitUntil:p=>promise=p});await promise;};
  return {context,listeners,cache,wait,setOffline:v=>offline=v,setAuth:v=>auth=v,get claimed(){return claimed;},async request(path,navigate=false){let response;const request=new Request(new URL(path,origin).href);Object.defineProperty(request,'mode',{value:navigate?'navigate':'cors'});listeners.fetch({request,respondWith:r=>response=r});return await response;}};
}
test('Offline shell is complete before ready; navigation and all assets work without network',async()=>{
  const h=harness();vm.runInNewContext(await fs.readFile(new URL('../dist/sw.js',import.meta.url),'utf8'),h.context);await h.wait('install');await h.wait('activate');assert.ok(h.claimed);assert.equal(h.cache.size,13);
  let ready;let pending;h.listeners.message({data:'CHECK_READY',ports:[{postMessage:value=>ready=value.ready}],waitUntil:p=>pending=p});await pending;assert.equal(ready,true);
  h.setOffline(true);assert.match(await (await h.request('/',true)).text(),/دفتر/);assert.equal((await h.request('/app.js')).status,200);assert.equal((await h.request('/style.css')).status,200);assert.equal((await h.request('/fonts/Vazirmatn.woff2')).status,200);assert.equal((await h.request('/offline.js')).status,200);
});
test('Online clock request bypasses the cached app shell',async()=>{
 const h=harness();vm.runInNewContext(await fs.readFile(new URL('../dist/sw.js',import.meta.url),'utf8'),h.context);await h.wait('install');
 assert.equal(await h.request('/index.html?__daftar_clock=123'),undefined);
});
test('Private hosting authentication failures never fall back to cached page while online',async()=>{
  const h=harness();vm.runInNewContext(await fs.readFile(new URL('../dist/sw.js',import.meta.url),'utf8'),h.context);await h.wait('install');h.setAuth(true);const response=await h.request('/',true);assert.equal(response.status,401);assert.equal(await response.text(),'Sign in');
});
test('Failed initial shell download does not report ready',async()=>{
  const h=harness();h.setOffline(true);vm.runInNewContext(await fs.readFile(new URL('../dist/sw.js',import.meta.url),'utf8'),h.context);await assert.rejects(()=>h.wait('install'));assert.equal(h.cache.size,0);
});

test('Canonical same-origin index.html redirects install successfully on the real Sites host',async()=>{
 const h=harness({redirect:'/'});vm.runInNewContext(await fs.readFile(new URL('../dist/sw.js',import.meta.url),'utf8'),h.context);await h.wait('install');assert.equal(h.cache.size,13);
});
test('Redirects to sign-in/external origins and 200 login HTML cannot be cached as the app',async()=>{
 for(const options of [{redirect:'/login'},{redirect:'https://auth.test/'},{login:true}]){const h=harness(options);vm.runInNewContext(await fs.readFile(new URL('../dist/sw.js',import.meta.url),'utf8'),h.context);await assert.rejects(()=>h.wait('install'));assert.equal(h.cache.size,0);}
});

test('GitHub Pages subpaths cache the app and font offline without touching another project cache',async()=>{
 const h=harness({origin:'https://owner.github.io/daftar/',redirect:'/daftar/'}),deleted=[];
 h.context.caches.keys=async()=>['daftar-shell-v5:/daftar/','daftar-shell-v6:/other/','game-cache'];
 h.context.caches.delete=async name=>{deleted.push(name);return true;};
 vm.runInNewContext(await fs.readFile(new URL('../dist/sw.js',import.meta.url),'utf8'),h.context);await h.wait('install');await h.wait('activate');
 assert.deepEqual(deleted,['daftar-shell-v5:/daftar/']);assert.equal(h.cache.size,13);
 assert.ok([...h.cache.keys()].every(key=>key.startsWith('https://owner.github.io/daftar/')));
 h.setOffline(true);assert.match(await(await h.request('/daftar/',true)).text(),/دفتر/);assert.equal((await h.request('app.js')).status,200);assert.equal((await h.request('fonts/Vazirmatn.woff2')).status,200);assert.equal(await h.request('/other/app.js'),undefined);
});
