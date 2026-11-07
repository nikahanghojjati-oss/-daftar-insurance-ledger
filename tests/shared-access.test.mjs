import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {FirebaseRest} from '../dist/firebase-rest.js';
import {LEDGER_UID,LEDGER_AUTH_UIDS} from '../dist/firebase-config.js';

const dad=LEDGER_AUTH_UIDS.find(uid=>uid!==LEDGER_UID);
const key='daftar.firebase.session.v1';
const memory=initial=>{
  const values=new Map(initial);
  return {values,getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
};

test('both approved sign-ins use the original ledger, preserving stored records and pending changes',async()=>{
  for(const authUid of LEDGER_AUTH_UIDS){
    const original=JSON.stringify({customers:[{id:'fictional',receipts:['stable-receipt']}],cloud:{owner:LEDGER_UID,pending:{fictional:'pending-operation'}}});
    const storage=memory([['daftar.ledger.v1',original]]),calls=[];
    const remote=new FirebaseRest({storage,fetcher:async(url,options)=>{
      calls.push({url,options});
      if(url.includes('identitytoolkit'))return Response.json({localId:authUid,idToken:'fake-token',refreshToken:'fake-refresh',expiresIn:'3600'});
      return Response.json({fields:{schemaVersion:{integerValue:'2'},currency:{stringValue:'toman'}},updateTime:'version'});
    }});
    await remote.signIn('fictional@example.invalid','fictional-password');
    assert.equal(remote.session().authUid,authUid);
    assert.equal(remote.session().owner,LEDGER_UID);
    await remote.meta();
    assert.ok(calls.at(-1).url.endsWith('/ledgers/'+LEDGER_UID));
    assert.equal(storage.getItem('daftar.ledger.v1'),original);
    assert.ok(!storage.getItem(key).includes('fictional-password'));
    assert.equal(remote.writes,0);
  }
});

test('dad access survives reopening and token renewal with the same account identity and ledger',async()=>{
  const storage=memory();
  const login=new FirebaseRest({storage,fetcher:async()=>Response.json({localId:dad,idToken:'expired',refreshToken:'dad-refresh',expiresIn:'0'})});
  await login.signIn('dad@example.invalid','fictional-password');
  const reopened=new FirebaseRest({storage,fetcher:async()=>Response.json({user_id:dad,id_token:'renewed',refresh_token:'rotated',expires_in:'3600'})});
  assert.equal(await reopened.token(),'renewed');
  assert.equal(reopened.session().authUid,dad);
  assert.equal(reopened.session().owner,LEDGER_UID);
});

test('legacy original-account sessions renew without requiring a new sign-in',async()=>{
  const storage=memory([[key,JSON.stringify({owner:LEDGER_UID,refreshToken:'legacy-refresh',expiresAt:0})]]);
  const remote=new FirebaseRest({storage,fetcher:async()=>Response.json({user_id:LEDGER_UID,id_token:'renewed',refresh_token:'rotated',expires_in:'3600'})});
  assert.equal(await remote.token(),'renewed');
  assert.equal(remote.session().authUid,LEDGER_UID);
});

test('unapproved sign-ins and mismatched refresh identities cannot replace retained access',async()=>{
  const existing=JSON.stringify({owner:LEDGER_UID,authUid:dad,refreshToken:'dad-refresh',expiresAt:0});
  const storage=memory([[key,existing]]);
  const wrong=new FirebaseRest({storage,fetcher:async()=>Response.json({localId:'unapproved',idToken:'bad',refreshToken:'bad',expiresIn:'3600'})});
  await assert.rejects(wrong.signIn('other@example.invalid','fake'),e=>e.code==='WRONG_LEDGER_ACCOUNT');
  assert.equal(storage.getItem(key),existing);
  for(const user_id of ['unapproved',LEDGER_UID]){
    const refresh=new FirebaseRest({storage,fetcher:async()=>Response.json({user_id,id_token:'bad',refresh_token:'bad',expires_in:'3600'})});
    await assert.rejects(refresh.token(),e=>e.code==='WRONG_LEDGER_ACCOUNT');
    assert.equal(storage.getItem(key),existing);
  }
  storage.setItem(key,JSON.stringify({owner:LEDGER_UID,authUid:'unapproved',refreshToken:'bad'}));
  assert.equal(wrong.session(),null);
});

test('candidate and selected rules contain the same exact account allowlist and fixed ledger',async()=>{
  const rules=await readFile(new URL('../firestore.rules',import.meta.url),'utf8');
  assert.equal(rules,await readFile(new URL('../firestore.sync.rules',import.meta.url),'utf8'));
  const users=rules.match(/request\.auth\.uid in \[([^\]]+)\]/)[1].match(/'[^']+'/g).map(x=>x.slice(1,-1));
  assert.deepEqual(users,LEDGER_AUTH_UIDS);
  assert.ok(rules.includes("ledger == '"+LEDGER_UID+"'"));
});
