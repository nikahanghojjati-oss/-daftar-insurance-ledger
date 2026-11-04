import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectFirebaseConnection} from '../dist/connectivity.js';

const fake=async (url,options)=>{
  if(String(url).startsWith('./'))return new Response(null,{status:200});
  if(options.method==='GET')return new Response(null,{status:200});
  return Response.json({error:{status:'INVALID_ARGUMENT',message:'INVALID_LOGIN_CREDENTIALS'}},{status:400});
};

test('browser probe confirms real auth API POST with only fake credentials',async()=>{
  const calls=[];
  const result=await inspectFirebaseConnection({apiKey:'public-test',fetcher:async(url,options)=>{
    calls.push({url:String(url),options});
    return fake(url,options);
  }});
  assert.equal(result.code,'SITE_OK | GOOGLE_REACHABLE | AUTH_REACHABLE');
  assert.match(result.summary,/اتصال Firebase/);
  assert.equal(calls.length,3);
  assert.equal(calls[1].options.mode,'no-cors');
  assert.equal(calls[2].options.method,'POST');
  const body=JSON.parse(calls[2].options.body);
  assert.equal(body.email,'daftar-connectivity-check@example.invalid');
  assert.equal(body.password,'deliberately-not-a-real-password');
  assert.ok(!JSON.stringify(calls).includes('actual-user'));
});
test('browser probe identifies Google unreachable without claiming password error',async()=>{
  const result=await inspectFirebaseConnection({fetcher:async(url,options)=>{
    if(options.method==='GET')throw new TypeError('network unreachable');
    if(options.method==='POST')throw new TypeError('Failed to fetch');
    return new Response(null,{status:200});
  }});
  assert.equal(result.code,'SITE_OK | GOOGLE_UNREACHABLE | AUTH_UNREACHABLE');
  assert.match(result.summary,/دامنه ورود Google/);
});
test('browser probe identifies failed authenticated POST despite Google being reachable',async()=>{
  const result=await inspectFirebaseConnection({fetcher:async(url,options)=>{
    if(options.method==='POST')throw new TypeError('CORS blocked');
    return new Response(null,{status:200});
  }});
  assert.equal(result.code,'SITE_OK | GOOGLE_REACHABLE | AUTH_UNREACHABLE');
  assert.match(result.summary,/درخواست ورود/);
});
test('browser probe returns structured Firebase configuration failure',async()=>{
  const result=await inspectFirebaseConnection({fetcher:async(url,options)=>{
    if(options.method==='POST')return Response.json({error:{status:'PERMISSION_DENIED',message:'API_KEY_HTTP_REFERRER_BLOCKED'}},{status:403});
    return new Response(null,{status:200});
  }});
  assert.equal(result.code,'SITE_OK | GOOGLE_REACHABLE | AUTH_HTTP_403_API_KEY_HTTP_REFERRER_BLOCKED');
});
