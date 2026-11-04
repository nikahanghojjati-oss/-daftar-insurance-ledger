import {FIREBASE} from './firebase-config.js';

// Explicit, user-triggered connectivity check. No private email, password,
// Auth token, customer data, or Firestore write is sent by this test.
const PROBE_EMAIL='daftar-connectivity-check@example.invalid';
const PROBE_PASSWORD='deliberately-not-a-real-password';

function firstCode(body) {
  const text=String(body?.error?.message||body?.error?.status||'UNKNOWN');
  const code=text.split(/[\s:]/)[0];
  return /^[A-Z][A-Z0-9_]{1,65}$/.test(code)?code:'UNKNOWN';
}
async function boundedFetch(fetcher,url,options={},timeout=10000) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeout);
  try {return await fetcher(url,{...options,signal:controller.signal});}
  finally {clearTimeout(timer);}
}
export async function inspectFirebaseConnection({
  fetcher=globalThis.fetch,
  apiKey=FIREBASE.apiKey,
  siteUrl='./index.html?__daftar_clock=login-check-'+Date.now(),
  onProgress=()=>{}
}={}) {
  const result={site:'UNKNOWN',google:'UNKNOWN',auth:'UNKNOWN'};
  onProgress('در حال بررسی اتصال سایت…');
  try {
    const r=await boundedFetch(fetcher,siteUrl,{method:'HEAD',cache:'no-store',credentials:'same-origin'});
    result.site=r.ok?'OK':'HTTP_'+r.status;
  } catch {result.site='UNREACHABLE';}

  onProgress('در حال بررسی دسترسی به Google…');
  try {
    // An opaque response is sufficient here: this checks network reachability
    // without depending on a CORS response or authenticating anyone.
    await boundedFetch(fetcher,'https://identitytoolkit.googleapis.com/$discovery/rest?version=v1',{
      method:'GET',mode:'no-cors',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'
    });
    result.google='REACHABLE';
  } catch {result.google='UNREACHABLE';}

  onProgress('در حال بررسی درخواست ورود Firebase با حساب ساختگی…');
  try {
    const response=await boundedFetch(fetcher,
      'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='+encodeURIComponent(apiKey),{
      method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',referrerPolicy:'no-referrer',
      body:JSON.stringify({email:PROBE_EMAIL,password:PROBE_PASSWORD,returnSecureToken:true})
    });
    let body;
    try {body=await response.json();}
    catch {result.auth='BAD_RESPONSE';}
    if(body) {
      const code=firstCode(body);
      result.auth=response.status===400 && ['INVALID_LOGIN_CREDENTIALS','EMAIL_NOT_FOUND','INVALID_PASSWORD'].includes(code)
        ? 'REACHABLE' : 'HTTP_'+response.status+'_'+code;
    }
  } catch {result.auth='UNREACHABLE';}

  let summary;
  if(result.auth==='REACHABLE') {
    summary='درخواست ورود آزمایشی به Firebase پاسخ دریافت کرد. اتصال Firebase روی این دستگاه برقرار است؛ دوباره ورود اصلی را امتحان کنید. اگر هنوز خطا می‌بینید، عکس کد خطا را بفرستید.';
  } else if(result.google==='UNREACHABLE') {
    summary='این دستگاه در حال حاضر نمی‌تواند به دامنه ورود Google متصل شود. یک بار با اینترنت Wi-Fi و یک بار با اینترنت موبایل امتحان کنید و فیلترشکن، DNS سفارشی یا مسدودکننده محتوا را بررسی کنید.';
  } else if(result.auth==='UNREACHABLE') {
    summary='دامنه Google در دسترس است، اما درخواست ورود به Firebase در این مرورگر کامل نمی‌شود. ممکن است درخواست به‌دلیل تنظیمات شبکه، فیلتر محتوا یا محدودیت مرورگر مسدود باشد.';
  } else if(result.auth.startsWith('HTTP_')) {
    summary='درخواست به Firebase رسید، اما سرور آن را با کد مشخصی رد کرد. کد پایین را برای بررسی تنظیمات پروژه ارسال کنید.';
  } else {
    summary='پاسخ درخواست Firebase کامل یا خوانا نبود. نتیجه آزمایش را برای بررسی ارسال کنید.';
  }
  if(result.site!=='OK')summary='اتصال آنلاین خود سایت هم تأیید نشد. اینترنت و دسترسی به GitHub Pages را بررسی کنید. '+summary;
  const code='SITE_'+result.site+' | GOOGLE_'+result.google+' | AUTH_'+result.auth;
  return {code,summary};
}
