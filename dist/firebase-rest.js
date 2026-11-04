import {FIREBASE,LEDGER_UID} from './firebase-config.js';
import {validateLedger} from './core.js';
const AUTH_KEY='daftar.firebase.session.v1';
export class CloudError extends Error {
  constructor(status,code) {super(code);this.status=status;this.code=code;}
}
// Deliberately show only controlled error codes; never echo Firebase response
// bodies, the typed password, tokens or an email address into the interface.
export function explainLoginFailure(error) {
  const code=String(error?.code||'').split(':')[0].trim().toUpperCase();
  if(code==='WRONG_LEDGER_ACCOUNT')return 'ایمیل و رمز پذیرفته شدند، اما این حساب، حساب اختصاصی این دفتر نیست. مدیر دفتر باید ایمیل کاربر اصلی را در Firebase Authentication ← Users بررسی کند. حساب تازه نسازید.';
  if(['INVALID_LOGIN_CREDENTIALS','EMAIL_NOT_FOUND','INVALID_PASSWORD','INVALID_EMAIL','USER_NOT_FOUND'].includes(code))return 'ایمیل یا رمز حساب اختصاصی دفتر پذیرفته نشد. ایمیل را دقیقاً با حساب موجود در Firebase Authentication ← Users مقایسه کنید. رمز Gmail یا ورود به کنسول Firebase، رمز این حساب نیست. [INVALID_LOGIN_CREDENTIALS]';
  if(code==='USER_DISABLED')return 'این حساب در Firebase غیرفعال شده است؛ مدیر دفتر باید آن را در Authentication ← Users بررسی کند. [USER_DISABLED]';
  if(code==='OPERATION_NOT_ALLOWED')return 'ورود با ایمیل و رمز در این پروژه Firebase فعال نیست؛ مدیر دفتر باید آن را در Authentication ← Sign-in method بررسی کند. [OPERATION_NOT_ALLOWED]';
  if(['API_KEY_INVALID','API_KEY_HTTP_REFERRER_BLOCKED','API_KEY_SERVICE_BLOCKED','API_KEY_API_TARGET_BLOCKED','PROJECT_NOT_FOUND','CONFIGURATION_NOT_FOUND'].includes(code))return 'تنظیمات اتصال برنامه به Firebase مشکل دارد. مدیر دفتر باید کلید API، محدودیت‌های آن و پروژه را بررسی کند. ['+code+']';
  if(['TOO_MANY_ATTEMPTS_TRY_LATER','QUOTA_EXCEEDED'].includes(code))return 'ورود موقتاً به‌دلیل تعداد زیاد تلاش‌ها محدود شده است. کمی بعد دوباره امتحان کنید. ['+code+']';
  if(['NETWORK_UNAVAILABLE','REQUEST_TIMEOUT','BAD_RESPONSE'].includes(code))return 'ارتباط با Firebase برقرار نشد. لینک دفتر را مستقیم در Safari یا Chrome، بیرون از مرورگر داخلی ChatGPT باز کنید و اینترنت را بررسی کنید. ['+code+']';
  if(code==='STORAGE_UNAVAILABLE')return 'مرورگر نمی‌تواند دسترسی این دستگاه را نگه دارد. لینک دفتر را در Safari یا Chrome معمولی باز کنید. [STORAGE_UNAVAILABLE]';
  return 'ورود به دفتر کامل نشد. لطفاً به مدیر دفتر اطلاع دهید. کد خطا: '+(/^[A-Z][A-Z0-9_]{1,65}$/.test(code)?code:'UNKNOWN');
}
export class FirebaseRest {
  constructor({fetcher=(...args)=>globalThis.fetch(...args),storage=globalThis.localStorage,config=FIREBASE,owner=LEDGER_UID}={}) {
    // Native browser fetch must be invoked with its own Window receiver.
    // Storing globalThis.fetch as this.fetcher then calling this.fetcher()
    // changes the receiver to FirebaseRest, which Safari can reject with
    // TypeError (previously misreported as NETWORK_UNAVAILABLE). A wrapper
    // preserves the proper global receiver without affecting fake fetchers.
    Object.assign(this,{fetcher,storage,config,owner});this.requests=0;this.reads=0;this.writes=0;this.refreshing=null;
    this.root=`https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/ledgers/${owner}`;
  }
  session() {try {const s=JSON.parse(this.storage.getItem(AUTH_KEY));return s?.owner===this.owner && typeof s.refreshToken==='string' ? s : null;} catch {return null;} }
  async request(url,options={}) {
    if(++this.requests>1500)throw new CloudError(429,'SESSION_LIMIT');
    const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),15000);
    try {
      let response;
      try {response=await this.fetcher(url,{...options,cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal});}
      catch(error){throw new CloudError(0,error?.name==='AbortError'?'REQUEST_TIMEOUT':'NETWORK_UNAVAILABLE');}
      let body;
      try {body=await response.json();}
      catch{throw new CloudError(response.status,'BAD_RESPONSE');}
      if(!response.ok) {
        // Firebase often returns generic status INVALID_ARGUMENT while
        // error.message contains the useful INVALID_LOGIN_CREDENTIALS code.
        const detail=String(body?.error?.message||'').split(/[\s:]/)[0];
        const status=String(body?.error?.status||'');
        const valid=value=>/^[A-Z][A-Z0-9_]{1,65}$/.test(value);
        const auth=url.includes('identitytoolkit.googleapis.com')||url.includes('securetoken.googleapis.com');
        // Auth's INVALID_ARGUMENT is generic; its message contains the real
        // login error. Firestore's FAILED_PRECONDITION / PERMISSION_DENIED
        // status is authoritative even if message is free-form English.
        const code=auth?(valid(detail)?detail:valid(status)?status:'REQUEST_FAILED')
          :(valid(status)?status:valid(detail)?detail:'REQUEST_FAILED');
        throw new CloudError(response.status,code);
      }
      return body;
    } finally {clearTimeout(timer);}
  }
  async signIn(email,password) {
    const result=await this.request(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(this.config.apiKey)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});
    if(result.localId!==this.owner)throw new CloudError(403,'WRONG_LEDGER_ACCOUNT');
    try {this.saveSession(result.idToken,result.refreshToken,result.expiresIn);}
    catch(error){if(error instanceof CloudError)throw error;throw new CloudError(0,'STORAGE_UNAVAILABLE');}
    return true;
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
    const url=path===':commit'?this.root.split('/documents/')[0]+'/documents:commit':this.root+path;
    const send=access=>this.request(url,{method,headers:{Authorization:`Bearer ${access}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    try{return await send(token);}
    catch(e){
      if(e.status!==401)throw e;
      const current=this.session();if(!current)throw e;
      this.storage.setItem(AUTH_KEY,JSON.stringify({...current,expiresAt:0}));
      return send(await this.token());
    }
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
    const payload=JSON.stringify(customer);
    if(new TextEncoder().encode(payload).length>700000)throw new CloudError(422,'CUSTOMER_TOO_LARGE');
    this.writes++;
    // A one-write commit carries the timestamp precondition in the JSON body.
    // This also avoids emulator PATCH query timestamp parsing differences.
    const name=`projects/${this.config.projectId}/databases/(default)/documents/ledgers/${this.owner}/customers/${customer.id}`;
    return this.firestore(':commit','POST',{writes:[{update:{name,fields:{payload:{stringValue:payload},operation:{stringValue:operation}}},currentDocument:updateTime?{updateTime}:{exists:false}}]});
  }
  async get(id,currency) {this.reads++;return this.decode(await this.firestore('/customers/'+encodeURIComponent(id)),currency);}
}
