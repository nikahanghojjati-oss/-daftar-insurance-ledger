export const OFFLINE_CACHE='daftar-shell-v20';

function bounded(promise,ms,message){
  let timer;
  return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),ms);})]).finally(()=>clearTimeout(timer));
}

export async function prepareOffline({serviceWorker,secure=true,Channel=globalThis.MessageChannel,timeout=25000,onProgress=()=>{}}={}){
  if(!secure||!serviceWorker)throw new Error('این مرورگر اجازه آماده‌سازی آفلاین نمی‌دهد. لینک دفتر را مستقیم در Chrome یا Safari معمولی باز کنید.');
  let installError='';
  const errorMessage=event=>{if(event.data?.type==='DAFTAR_INSTALL_ERROR')installError=event.data.error;};
  serviceWorker.addEventListener?.('message',errorMessage);
  const run=async()=>{
    onProgress('در حال دریافت نسخه آفلاین…');
    const registration=await serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
    const worker=registration.installing||registration.waiting||registration.active;
    if(!worker)throw new Error('نسخه آفلاین فعال نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.');
    if(worker.state!=='activated')await new Promise((resolve,reject)=>{
      const changed=()=>{
        if(worker.state==='activated'){cleanup();resolve();}
        else if(worker.state==='redundant'){cleanup();reject(Object.assign(new Error('دریافت یکی از فایل‌های برنامه کامل نشد. اینترنت را وصل کنید و «تلاش دوباره» را بزنید.'),{detail:installError}));}
      };
      const cleanup=()=>worker.removeEventListener('statechange',changed);
      worker.addEventListener('statechange',changed);changed();
    });
    onProgress('در حال بررسی فایل‌های آفلاین…');
    const ready=await bounded(new Promise((resolve,reject)=>{
      const channel=new Channel();
      channel.port1.onmessage=e=>{channel.port1.close();resolve(e.data);};
      channel.port1.onmessageerror=()=>{channel.port1.close();reject(new Error('بررسی نسخه آفلاین کامل نشد. دوباره تلاش کنید.'));};
      worker.postMessage('CHECK_READY',[channel.port2]);
    }),4000,'پاسخ بررسی آفلاین دریافت نشد. دوباره تلاش کنید.');
    if(!ready?.ready||ready.version!==OFFLINE_CACHE)throw new Error('همه فایل‌های نسخه تازه ذخیره نشده‌اند. اینترنت را وصل کنید و دوباره تلاش کنید.');
    return ready;
  };
  try{return await bounded(run(),timeout,'آماده‌سازی آفلاین کامل نشد. لینک را مستقیم در مرورگر باز کنید؛ سپس «تلاش دوباره» را بزنید.');}
  finally{serviceWorker.removeEventListener?.('message',errorMessage);}
}


