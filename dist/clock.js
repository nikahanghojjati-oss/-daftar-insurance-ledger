import {setClockOffset,today} from './core.js';

// The Date header is read from a fresh same-origin response. No customer data is sent.
export async function verifyClock({fetcher=fetch,now=Date.now,timeoutMs=8000}={}){
  const url=new URL('./index.html',import.meta.url);
  url.searchParams.set('__daftar_clock',String(now()));
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),timeoutMs),start=now();
  try{
    const response=await fetcher(url.href,{method:'HEAD',cache:'no-store',signal:abort.signal});
    const end=now(),server=Date.parse(response.headers.get('date')||''),age=Number(response.headers.get('age')||0);
    if(!response.ok||!Number.isFinite(server)||!Number.isFinite(age)||age>60||end-start>timeoutMs||end<start)throw new Error('ساعت آنلاین در دسترس نیست.');
    // HTTP Date has one-second precision; reject implausible/very slow responses.
    const offset=server-(start+end)/2;
    setClockOffset(offset);
    return {verified:true,day:today(),offset};
  }finally{clearTimeout(timer);}
}
