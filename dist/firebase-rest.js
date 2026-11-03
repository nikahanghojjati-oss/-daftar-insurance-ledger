import {FIREBASE,LEDGER_UID} from './firebase-config.js';
import {validateLedger} from './core.js';
const AUTH_KEY='daftar.firebase.session.v1';
export class CloudError extends Error {
  constructor(status,code) {super(code);this.status=status;this.code=code;}
}
export class FirebaseRest {
  constructor({fetcher=globalThis.fetch,storage=globalThis.localStorage,config=FIREBASE,owner=LEDGER_UID}={}) {
    Object.assign(this,{fetcher,storage,config,owner});this.requests=0;this.reads=0;this.writes=0;this.refreshing=null;
    this.root=`https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/ledgers/${owner}`;
  }
  session() {try {const s=JSON.parse(this.storage.getItem(AUTH_KEY));return s?.owner===this.owner && typeof s.refreshToken==='string' ? s : null;} catch {return null;} }
  async request(url,options={}) {
    if(++this.requests>1500)throw new CloudError(429,'SESSION_LIMIT');
    const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),15000);
    try {
      const response=await this.fetcher(url,{...options,cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal});
      const body=await response.json();
      if(!response.ok)throw new CloudError(response.status,body.error?.status||body.error?.message||'REQUEST_FAILED');
      return body;
    } finally {clearTimeout(timer);}
  }
  async signIn(email,password) {
    const result=await this.request(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(this.config.apiKey)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});
    if(result.localId!==this.owner)throw new CloudError(403,'WRONG_LEDGER_ACCOUNT');
    this.saveSession(result.idToken,result.refreshToken,result.expiresIn);return true;
  }
  saveSession(idToken,refreshToken,expiresIn) {
    if(!idToken||!refreshToken)throw new CloudError(401,'INVALID_SESSION');
    this.storage.setItem(AUTH_KEY,JSON.stringify({owner:this.owner,idToken,refreshToken,expiresAt:Date.now()+Number(expiresIn)*1000-60000}));
  }
  async token() {
    const current=this.session();if(!current)throw new CloudError(401,'SIGN_IN_REQUIRED');
    if(current.idToken && current.expiresAt>Date.now())return current.idToken;
    if(!this.refreshing)this.refreshing=(async()=>{
      const r=await this.request(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(this.config.apiKey)}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:current.refreshToken}).toString()});
      if(r.user_id!==this.owner)throw new CloudError(403,'WRONG_LEDGER_ACCOUNT');
      this.saveSession(r.id_token,r.refresh_token,r.expires_in);return r.id_token;
    })().finally(()=>this.refreshing=null);
    return this.refreshing;
  }
  async firestore(path,method='GET',body) {
    const token=await this.token();
    return this.request(this.root+path,{method,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  }
  async meta() {
    this.reads++;
    try {
      const d=await this.firestore('');const currency=d.fields?.currency?.stringValue;
      if(d.fields?.schemaVersion?.integerValue!=='2'||!['toman','rial'].includes(currency))throw new CloudError(422,'REMOTE_SCHEMA');
      return {currency,updateTime:d.updateTime};
    } catch(e) {if(e.status===404)return null;throw e;}
  }
  async createMeta(currency) {
    this.writes++;
    return this.firestore('?currentDocument.exists=false','PATCH',{fields:{schemaVersion:{integerValue:'2'},currency:{stringValue:currency}}});
  }
  decode(d,currency) {
    const value=JSON.parse(d.fields?.payload?.stringValue||'null');
    validateLedger({schemaVersion:2,currency,customers:[value]});
    if(d.name.split('/').at(-1)!==encodeURIComponent(value.id) && decodeURIComponent(d.name.split('/').at(-1))!==value.id)throw new CloudError(422,'REMOTE_ID');
    if(typeof d.updateTime!=='string')throw new CloudError(422,'REMOTE_VERSION');
    return {value,updateTime:d.updateTime};
  }
  async list(currency) {
    let pageToken='', result=[];
    do {
      const query=new URLSearchParams({pageSize:'200'});if(pageToken)query.set('pageToken',pageToken);
      const r=await this.firestore('/customers?'+query);
      this.reads+=Math.max(1,r.documents?.length||0);
      result.push(...(r.documents||[]).map(d=>this.decode(d,currency)));
      if(result.length>10000||this.reads>12000)throw new CloudError(429,'SESSION_LIMIT');
      pageToken=r.nextPageToken||'';
    } while(pageToken);
    return result;
  }
  async put(customer,updateTime,operation) {
    if(!customer.id||customer.id.includes('/')||customer.id==='.'||customer.id==='..')throw new CloudError(422,'INVALID_ID');
    const query=new URLSearchParams(updateTime?{'currentDocument.updateTime':updateTime}:{'currentDocument.exists':'false'});
    const payload=JSON.stringify(customer);
    if(new TextEncoder().encode(payload).length>700000)throw new CloudError(422,'CUSTOMER_TOO_LARGE');
    this.writes++;
    return this.firestore('/customers/'+encodeURIComponent(customer.id)+'?'+query,'PATCH',{fields:{payload:{stringValue:payload},operation:{stringValue:operation}}});
  }
  async get(id,currency) {this.reads++;return this.decode(await this.firestore('/customers/'+encodeURIComponent(id)),currency);}
}
