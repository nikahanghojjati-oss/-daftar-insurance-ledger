import test from 'node:test';
import assert from 'node:assert/strict';
import {readAppearance,saveAppearance,APPEARANCE_KEY} from '../dist/appearance.js';
test('appearance choice persists independently of ledger, session, queue, drafts and backup revision',()=>{
 const data=new Map([['daftar.ledger.v1','ledger-with-receipt'],['daftar.firebase.session.v1','session'],['daftar.drafts.own','unfinished-form'],['daftar.backup-revision.own','revision']]);const original=new Map(data),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 for(const id of ['daybook','agenda','desk']){saveAppearance(id,storage);assert.equal(readAppearance(storage),id);for(const [key,value]of original)assert.equal(data.get(key),value);}
 assert.deepEqual([...data.keys()].filter(k=>!original.has(k)),[APPEARANCE_KEY]);
});
test('invalid, missing and inaccessible preferences have a safe default; failed write is reported',()=>{
 for(const value of [null,'','<script>','dark',JSON.stringify({id:'desk'})])assert.equal(readAppearance({getItem:()=>value}),'daybook');
 assert.equal(readAppearance({getItem:()=>{throw Error('blocked');}}),'daybook');
 assert.throws(()=>saveAppearance('desk',{setItem:()=>{throw Error('full');}}),/full/);
});
