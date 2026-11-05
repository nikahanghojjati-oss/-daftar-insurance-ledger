import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectOfflineController} from '../dist/offline.js';
import {connectionDetails} from '../dist/connection-details.js';
import {FIREBASE_CLIENT_VERSION} from '../dist/firebase-rest.js';

function fixture({reply={version:'daftar-shell-v16'},silent=false,changed=false}={}) {
  let closed=0;
  class Channel {
    constructor(){
      this.port1={close(){closed++;}};
      this.port2={close(){closed++;},postMessage:value=>queueMicrotask(()=>this.port1.onmessage({data:value}))};
    }
  }
  const serviceWorker={controller:{postMessage(message,ports){
    assert.equal(message,'CHECK_READY');
    if(changed)serviceWorker.controller={};
    if(!silent)ports[0].postMessage(reply);
  }}};
  return {serviceWorker,Channel,closed:()=>closed};
}
const snapshot={pageVersion:'old-page',loginVersion:FIREBASE_CLIENT_VERSION,expectedCache:'daftar-shell-v16',preparedCache:'daftar-shell-v17'};
test('Old running page, newer prepared cache and actual older controller remain distinct',async()=>{
  const f=fixture(),controller=await inspectOfflineController(f);
  assert.deepEqual(controller,{status:'verified',version:'daftar-shell-v16'});
  const html=connectionDetails({...snapshot,controller});
  assert.match(html,/نسخهٔ کد صفحه<\/dt><dd[^>]*>old-page/);
  assert.match(html,/کش آماده‌شده<\/dt><dd[^>]*>daftar-shell-v17/);
  assert.match(html,/کش کنترل‌کنندهٔ همین صفحه<\/dt><dd[^>]*>daftar-shell-v16/);
  assert.match(html,new RegExp(FIREBASE_CLIENT_VERSION));
  assert.equal(f.closed(),2);
});
test('Unresponsive controller stays unverified despite a newer prepared cache; ports close',async()=>{
  const f=fixture({silent:true}),controller=await inspectOfflineController({...f,timeout:10});
  assert.deepEqual(controller,{status:'unavailable'});
  assert.match(connectionDetails({...snapshot,controller}),/کش کنترل‌کنندهٔ همین صفحه<\/dt><dd[^>]*>نسخه تأیید نشد/);
  assert.equal(f.closed(),2);
});
test('Missing, replaced and malformed controllers cannot claim a verified version',async()=>{
  assert.deepEqual(await inspectOfflineController({serviceWorker:{}}),{status:'uncontrolled'});
  assert.deepEqual(await inspectOfflineController(fixture({changed:true})),{status:'changed'});
  assert.deepEqual(await inspectOfflineController(fixture({reply:{version:'<script>unsafe</script>'}})),{status:'unavailable'});
  const html=connectionDetails({...snapshot,pageVersion:'<unsafe>',controller:{status:'unavailable'},password:'DO_NOT_SHOW',idToken:'TOKEN_DO_NOT_SHOW'});
  assert.ok(!html.includes('<unsafe>'));assert.ok(!html.includes('DO_NOT_SHOW'));
});
