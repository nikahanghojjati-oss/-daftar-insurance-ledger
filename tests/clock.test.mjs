import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyClock} from '../dist/clock.js';
import {today,tehranDay,setClockOffset} from '../dist/core.js';

test('Online date uses fresh same-origin Date header and corrects a two-day device skew',async()=>{
  const device=Date.now(),server=device+2*86400000,reads=[];
  const result=await verifyClock({now:()=>device,fetcher:async (url,options)=>{
    reads.push([url,options]);return {ok:true,headers:{get:key=>key==='date'?new Date(server).toUTCString():null}};
  }});
  assert.equal(result.verified,true);assert.equal(today(),tehranDay(server));
  assert.equal(reads[0][1].method,'HEAD');assert.equal(reads[0][1].cache,'no-store');
  assert.match(reads[0][0],/\/index\.html\?__daftar_clock=/);
  setClockOffset(0);
});
test('A missing server timestamp cannot silently claim verification',async()=>{
  await assert.rejects(verifyClock({fetcher:async()=>({ok:true,headers:{get:()=>null}})}),/ساعت آنلاین/);
  setClockOffset(0);
});
