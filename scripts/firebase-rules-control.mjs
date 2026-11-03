import fs from 'node:fs';
import crypto from 'node:crypto';
import {assertReadyRules} from './rules-readiness.mjs';

const project=process.env.FIREBASE_PROJECT_ID;
const operation=process.env.FIREBASE_RULES_OPERATION;
if(project!=='daftar-insurance-ledger')throw Error('Unexpected Firebase project.');
if(!['verify','publish'].includes(operation))throw Error('Unsupported operation.');
if(process.env.GITHUB_REPOSITORY!=='nikahanghojjati-oss/-daftar-insurance-ledger'||process.env.GITHUB_REF!=='refs/heads/main')throw Error('Only reviewed main in the dedicated repository may use this credential.');
const rulesFile=new URL('../firestore.rules',import.meta.url);
let local;
if(operation==='publish'){
  local=fs.readFileSync(rulesFile,'utf8');
  assertReadyRules(local,fs.readFileSync(new URL('../firestore.sync.rules',import.meta.url),'utf8'));
}
const credentialsPath=process.env.GOOGLE_APPLICATION_CREDENTIALS;
if(!credentialsPath||!fs.existsSync(credentialsPath))throw Error('GitHub Actions credential is missing.');
const credentials=JSON.parse(fs.readFileSync(credentialsPath,'utf8'));
if(credentials.project_id!==project||!credentials.client_email||!credentials.private_key)throw Error('The service-account key belongs to another project or is incomplete.');

function encode(value){return Buffer.from(JSON.stringify(value)).toString('base64url');}
async function accessToken(){
  const now=Math.floor(Date.now()/1000),signed=[encode({alg:'RS256',typ:'JWT'}),encode({iss:credentials.client_email,scope:'https://www.googleapis.com/auth/cloud-platform',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600})].join('.');
  const signature=crypto.sign('RSA-SHA256',Buffer.from(signed),credentials.private_key).toString('base64url');
  const res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:`${signed}.${signature}`})});
  if(!res.ok)throw Error(`Google OAuth rejected the rules-only account (HTTP ${res.status}).`);
  const data=await res.json();if(!data.access_token)throw Error('Google OAuth did not issue an access token.');
  return data.access_token;
}
async function request(method,path,token,body,{allow404=false}={}){
  const res=await fetch(`https://firebaserules.googleapis.com/v1/${path}`,{method,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  if(allow404&&res.status===404)return null;
  if(!res.ok)throw Error(`Firebase Rules API ${method} ${path} returned HTTP ${res.status}.`);
  return res.json();
}
const token=await accessToken();
if(operation==='verify'){
  // A list call proves the key, project, API and Rules Admin role without changing rules or data.
  await request('GET',`projects/${project}/rulesets?pageSize=1`,token);
  console.log(`FIREBASE_RULES_ACCESS_OK project=${project}; no rules or customer data changed.`);
}else{
  // Compiling the new ruleset comes before changing the release pointer.
  const result=await request('POST',`projects/${project}/rulesets`,token,{source:{files:[{name:'firestore.rules',content:local}]}});
  if(!result.name?.startsWith(`projects/${project}/rulesets/`))throw Error('Rules compilation returned an unexpected resource.');
  const path=`projects/${project}/releases/cloud.firestore`;
  const existing=await request('GET',path,token,null,{allow404:true});
  const release=existing
    ?await request('PATCH',path,token,{release:{name:path,rulesetName:result.name},updateMask:'rulesetName'})
    :await request('POST',`projects/${project}/releases`,token,{name:path,rulesetName:result.name});
  if(release.rulesetName!==result.name)throw Error('The Firestore release did not accept the new ruleset.');
  const live=await request('GET',path,token);
  const source=await request('GET',live.rulesetName,token);
  if(source.source?.files?.length!==1||source.source.files[0].content!==local)throw Error('The live rules source differs from the reviewed file.');
  const hash=crypto.createHash('sha256').update(local).digest('hex');
  console.log(`FIREBASE_RULES_EXACT_SOURCE_OK project=${project} sha256=${hash} release=${live.name}`);
}

