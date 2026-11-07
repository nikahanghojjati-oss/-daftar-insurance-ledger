import {uid,validateLedger} from './core.js';
import {equal,canonical,initializeCloud,queueChanges,reconcile,resolveConflict,backupLedger,stampBusinessRevision} from './sync-model.js';
import {FirebaseRest} from './firebase-rest.js';
import {LEDGER_UID} from './firebase-config.js';
export {queueChanges,backupLedger,stampBusinessRevision};
export const LEDGER_LOCK='daftar-personal-ledger-v1';
export async function withLedgerLock(task) {
  if(!globalThis.navigator?.locks)throw Error('برای همگام‌سازی، دفتر را در نسخه تازه Chrome یا Safari باز کنید.');
  return navigator.locks.request(LEDGER_LOCK,task);
}
export class LedgerSync {
  constructor({read,write,lock=withLedgerLock,remote=new FirebaseRest(),changed=()=>{},online=()=>globalThis.navigator?.onLine!==false}={}) {
    Object.assign(this,{read,write,lock,remote,changed,online});this.busy=null;this.message='';this.status='local';
  }
  state(status,message='') {this.status=status;this.message=message;this.changed();}
  async update(fn) {return this.lock(()=>{const previous=this.read();const next=fn(previous);validateLedger(next);this.write(next);this.changed();return next;});}
  async signIn(email,password) {await this.remote.signIn(email,password);this.changed();}
  async snapshot() {
    const meta=await this.remote.meta();const documents=await this.remote.list(meta?.currency||'toman');
    if(!meta && documents.length)throw Error('اطلاعات آنلاین ناقص است؛ تغییری انجام نشد.');
    return {meta,documents};
  }
  async preview() {
    const snapshot=await this.snapshot(), local=this.read();
    return {...snapshot,local:backupLedger(local),fingerprint:canonical({local,snapshot})};
  }
  async connect(preview) {
    if(this.busy)throw Error('کمی صبر کنید تا بررسی فعلی تمام شود.');
    this.busy=(async()=>{
      const snapshot=await this.snapshot();
      await this.lock(async()=>{
        const local=this.read();
        if(canonical({local,snapshot})!==preview.fingerprint)throw Error('یکی از نسخه‌ها تغییر کرده است؛ پیش‌نمایش را دوباره بررسی کنید.');
        if(local.cloud)throw Error('این دستگاه قبلاً متصل شده است.');
        if(snapshot.meta && snapshot.meta.currency!==local.currency && local.customers.length)throw Error('واحد پول دو دفتر متفاوت است؛ اتصال انجام نشد.');
        // Metadata never changes currency after creation. A competing creator
        // causes a precondition failure before any customer is uploaded.
        if(!snapshot.meta)await this.remote.createMeta(local.currency);
        const next=initializeCloud({...local,currency:snapshot.meta?.currency||local.currency},LEDGER_UID);
        for(const c of local.customers)next.cloud.pending[c.id]=uid();
        this.write(reconcile(next,snapshot.documents));this.changed();
      });
    })().finally(()=>this.busy=null);
    await this.busy;return this.run();
  }
  run({full=true}={}) {
    if(this.busy){this.rerun=true;this.rerunFull ||= full;return this.busy;}
    if(!this.read()?.cloud)return Promise.resolve();
    if(!this.online()){this.state('offline');return Promise.resolve();}
    this.busy=this.perform(full).catch(e=>{
      const message=e.status===401?'ورود این دستگاه نیاز به تمدید دارد.':e.status===403?'دسترسی آنلاین رد شد؛ تنظیمات حساب یا قوانین باید بررسی شود.':e.code==='SESSION_LIMIT'?'حد بررسی این نوبت رسید؛ بعداً دوباره تلاش کنید.':'اتصال آنلاین کامل نشد. حساب‌ها و تغییرات در صف روی این دستگاه باقی مانده‌اند.';
      this.state('error',message);
    }).finally(()=>{this.busy=null;if(this.rerun){const again=this.rerunFull;this.rerun=false;this.rerunFull=false;queueMicrotask(()=>this.run({full:again}));}});
    return this.busy;
  }
  async perform(full) {
    this.state('syncing');
    for(let attempt=0;attempt<3;attempt++) {
      const localState=this.read();
      let meta,documents;
      if(full){({meta,documents}=await this.snapshot());}
      else {
        meta=await this.remote.meta();
        documents=Object.entries(localState.cloud.base).filter(([id])=>!localState.cloud.pending[id]).map(([,d])=>d);
        for(const id of Object.keys(localState.cloud.pending)){
          try{documents.push(await this.remote.get(id,localState.currency));}
          catch(e){if(e.status!==404)throw e;}
        }
      }
      if(!meta||meta.currency!==this.read().currency)throw Error('REMOTE_CURRENCY');
      await this.update(local=>reconcile(local,documents));
      let retry=false;
      for(const id of Object.keys(this.read().cloud.pending)) {
        const local=this.read();if(local.cloud.conflicts[id])continue;
        const customer=local.customers.find(c=>c.id===id);if(!customer)throw Error('MISSING_CUSTOMER');
        const baseline=local.cloud.base[id];
        // Resolutions lack an updateTime intentionally; refresh and reconcile
        // before attempting a compare-and-set write.
        if(baseline && !baseline.updateTime){retry=true;break;}
        try {
          await this.remote.put(customer,baseline?.updateTime,local.cloud.pending[id]);
          const acknowledged=await this.remote.get(id,local.currency);
          // Only a server read acknowledges an upload. A lost response or a
          // local edit during the write remains pending and is retried safely.
          await this.update(current=>{
            const old=structuredClone(current), c=old.customers.find(c=>c.id===id);
            if(equal(c,customer)) {
              old.cloud.base[id]={value:structuredClone(customer),updateTime:acknowledged.updateTime};
              // The read may already contain a later remote update.
              const all=old.customers.filter(c=>c.id!==id).flatMap(c=>old.cloud.base[c.id]?[old.cloud.base[c.id]]:[]);
              return reconcile(old,[...all,acknowledged]);
            }
            // Establish the acknowledged write as the base, then merge any
            // local edit made while the request was in flight with readback.
            old.cloud.base[id]={value:structuredClone(customer),updateTime:acknowledged.updateTime};
            const all=Object.entries(old.cloud.base).filter(([key])=>key!==id).map(([,d])=>d);
            return reconcile(old,[...all,acknowledged]);
          });
        } catch(e) {
          if([409,412].includes(e.status)||e.code==='FAILED_PRECONDITION'||e.code==='ABORTED'){retry=true;break;}
          throw e;
        }
      }
      const final=this.read();
      if(Object.keys(final.cloud.conflicts).length){this.state('conflict');return;}
      if(!Object.keys(final.cloud.pending).length) {
        const checked=await this.update(current=>Object.keys(current.cloud.pending).length||Object.keys(current.cloud.conflicts).length?current:{...current,cloud:{...current.cloud,confirmedAt:new Date().toISOString()}});
        if(!Object.keys(checked.cloud.pending).length){this.state('confirmed');return;}
      }
      if(!retry)continue;
    }
    this.state('pending','تغییر تازه‌ای در دستگاه دیگر ثبت شد؛ دوباره همگام‌سازی کنید.');
  }
  async resolve(id,choice) {await this.update(local=>resolveConflict(local,id,choice));return this.run();}
}
