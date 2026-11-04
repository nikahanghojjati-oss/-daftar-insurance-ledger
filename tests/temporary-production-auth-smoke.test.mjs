import test from 'node:test';
import assert from 'node:assert/strict';
import {FIREBASE} from '../dist/firebase-config.js';

// One-time, public-configuration-only smoke check. No real email, password,
// session, customer record or Firestore write. Remove before merge.
test('production Firebase Auth public API accepts the configured key (fake credentials fail normally)',async()=>{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try {
    const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='+encodeURIComponent(FIREBASE.apiKey),{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email:'unregistered-smoke-check@example.invalid',password:'intentionally-incorrect-non-secret',returnSecureToken:true}),
      signal:controller.signal
    });
    const body=await response.json();
    const detail=String(body?.error?.message||body?.error?.status||'UNKNOWN').split(/[\\s:]/)[0];
    console.log('PRODUCTION_AUTH_SMOKE status='+response.status+' code='+detail);
    assert.equal(response.status,400,'Expected invalid credentials (not API key/project configuration failure)');
    assert.ok(['INVALID_LOGIN_CREDENTIALS','EMAIL_NOT_FOUND','INVALID_PASSWORD'].includes(detail),'Unexpected Firebase error: '+detail);
  } finally {clearTimeout(timer);}
});
