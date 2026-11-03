import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {prepareOffline,OFFLINE_CACHE} from '../dist/offline.js';
function fake({state='activated',reply={ready:true,version:OFFLINE_CACHE},fail=false}={}){
 const handlers=new Map();
 const worker={state,addEventListener:(key,fn)=>handlers.set(key,fn),removeEventListener:key=>handlers.delete(key),postMessage:(_,ports)=>ports[0].postMessage(reply)};
 class Channel{constructor(){this.port1={close(){}};this.port2={postMessage:value=>queueMicrotask(()=>this.port1.onmessage({data:value}))};}}
 return {worker,Channel,serviceWorker:{register:async()=>{if(fail)throw new Error('registration denied');return {installing:state==='activated'?null:worker,active:worker};}},change(next){worker.state=next;handlers.get('statechange')?.();}};
}
test('Ready only after a complete current-version cache reply',async()=>{
 const f=fake(),progress=[];assert.equal((await prepareOffline({...f,onProgress:s=>progress.push(s)})).ready,true);assert.equal(progress.length,2);
});
test('A failed installation is reported rather than waiting indefinitely on serviceWorker.ready',async()=>{
 const f=fake({state:'installing'});const p=prepareOffline({...f,timeout:100});queueMicrotask(()=>f.change('redundant'));await assert.rejects(p,/کامل نشد/);
});
test('A stalled installation reaches a bounded Farsi error',async()=>{
 const f=fake({state:'installing'});await assert.rejects(prepareOffline({...f,timeout:20}),/کامل نشد/);
});
test('An older worker and an incomplete cache cannot advertise readiness',async()=>{
 for(const reply of [{ready:true,version:'daftar-shell-v2'},{ready:false,version:OFFLINE_CACHE}])await assert.rejects(prepareOffline({...fake({reply}),timeout:100}),/همه فایل/);
});
test('Unsupported contexts and registration failures reject honestly',async()=>{
 await assert.rejects(prepareOffline({serviceWorker:null}),/مرورگر/);await assert.rejects(prepareOffline({...fake({fail:true})}),/registration denied/);
});
test('Every required local asset exists; bundled font is WOFF2 with its license',async()=>{
 const root=new URL('../dist/',import.meta.url),sw=await fs.readFile(new URL('sw.js',root),'utf8');
 const shell=JSON.parse(sw.match(/const SHELL=(\[[^;]+\]);/)[1].replaceAll("'",'"'));
 for(const name of shell)if(name!=='./')assert.ok((await fs.stat(new URL(name,root))).size>0,name);
 assert.equal((await fs.readFile(new URL('fonts/Vazirmatn.woff2',root))).subarray(0,4).toString(),'wOF2');assert.match(await fs.readFile(new URL('fonts/OFL.txt',root),'utf8'),/SIL OPEN FONT LICENSE/);
});
