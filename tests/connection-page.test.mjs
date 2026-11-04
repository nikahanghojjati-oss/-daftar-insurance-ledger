import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('standalone mobile diagnostic is linked to real non-secret probe, no account entry or storage reset',async()=>{
 const html=await readFile(new URL('../dist/connection-check.html',import.meta.url),'utf8');
 assert.match(html,/lang="fa" dir="rtl"/);
 assert.match(html,/inspectFirebaseConnection/);
 assert.match(html,/connectivity\.js/);
 assert.match(html,/id="test"/);
 assert.match(html,/id="result"/);
 assert.match(html,/id="copy"/);
 assert.doesNotMatch(html,/<input|localStorage|sessionStorage|caches\.delete|serviceWorker\.unregister/);
 assert.doesNotMatch(html,/nick\.hojjati@|authToken|refreshToken|service.account/i);
});

test('standalone diagnostic does not rely on a cached application shell',async()=>{
 const sw=await readFile(new URL('../dist/sw.js',import.meta.url),'utf8');
 const page=await readFile(new URL('../dist/connection-check.html',import.meta.url),'utf8');
 assert.ok(!sw.includes("'./connection-check.html'"),'page must be network-fetched independently of a stale offline shell');
 assert.ok(page.includes('type="module"') && page.includes("from './connectivity.js'"));
});
