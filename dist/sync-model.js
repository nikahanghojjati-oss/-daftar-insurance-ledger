import {validateLedger,uid} from './core.js';

// Deterministic comparison ignores object property order, never array order.
export const canonical = value => value === undefined ? 'undefined' : JSON.stringify(value, (_,v) =>
  v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])) : v);
export const equal = (a,b) => canonical(a) === canonical(b);
const clone = value => value === undefined ? undefined : structuredClone(value);
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const entityArrays = new Set(['policies','payments']);
const auditArrays = new Set(['revisions','scheduleHistory','syncResolutions']);

function merge(base,local,remote,path,conflicts) {
  if(equal(local,remote))return clone(local);
  if(equal(local,base))return clone(remote);
  if(equal(remote,base))return clone(local);
  const key = path.at(-1);
  // Receipts are atomic. Two edits to one receipt require human review.
  if(path.includes('payments') && object(local) && object(remote)) {
    conflicts.push(path.join('.'));return clone(local);
  }
  if(Array.isArray(local) && Array.isArray(remote) && entityArrays.has(key)) {
    const b = new Map((base || []).map(v=>[v.id,v]));
    const l = new Map(local.map(v=>[v.id,v])), r = new Map(remote.map(v=>[v.id,v]));
    return [...new Set([...l.keys(),...r.keys(),...b.keys()])].sort().flatMap(id=>{
      const result=merge(b.get(id),l.get(id),r.get(id),[...path,id],conflicts);
      return result === undefined ? [] : [result];
    });
  }
  if(Array.isArray(local) && Array.isArray(remote) && auditArrays.has(key)) {
    // History is append-only; deletions/rewrites must be reviewed.
    if((base || []).every(v=>local.some(x=>equal(v,x)) && remote.some(x=>equal(v,x)))) {
      const entries=new Map([...local,...remote].map(v=>[canonical(v),clone(v)]));
      return [...entries.values()].sort((a,b)=>(a.at||'').localeCompare(b.at||'') || canonical(a).localeCompare(canonical(b)));
    }
  }
  if(object(local) && object(remote) && (base === undefined || object(base))) {
    const result={};
    for(const field of new Set([...Object.keys(base||{}),...Object.keys(local),...Object.keys(remote)])) {
      const v=merge(base?.[field],local[field],remote[field],[...path,field],conflicts);
      if(v !== undefined)result[field]=v;
    }
    return result;
  }
  conflicts.push(path.join('.'));return clone(local);
}

export function mergeCustomer(base,local,remote,currency) {
  const conflicts=[];
  let value=merge(base,local,remote,[],conflicts);
  try { if(value)validateLedger({schemaVersion:2,currency,customers:[value]}); }
  catch { conflicts.push('invalid-combined-balance-or-schedule');value=clone(local); }
  return {value,conflicts};
}

export function initializeCloud(ledger,owner) {
  return {...ledger,cloud:{version:1,owner,base:{},pending:{},conflicts:clone(ledger.unresolvedSyncConflicts||{}),resolutions:clone(ledger.syncResolutionHistory||[]),confirmedAt:null}};
}

// This object and the business ledger are serialized in ONE localStorage write.
export function queueChanges(before,next) {
  if(!before.cloud)return next;
  const cloud=clone(before.cloud);
  if(before.currency!==next.currency)throw Error('واحد پول دفتر متصل قابل تغییر نیست.');
  if(Object.keys(cloud.conflicts).length)throw Error('ابتدا اختلاف دو نسخه را در بخش همگام‌سازی بررسی کنید.');
  const previous=new Map(before.customers.map(c=>[c.id,c]));
  for(const c of next.customers)if(!equal(previous.get(c.id),c))cloud.pending[c.id]=uid();
  if(before.customers.some(c=>!next.customers.some(n=>n.id===c.id)))throw Error('حذف یا جایگزینی دفتر متصل پشتیبانی نمی‌شود؛ سابقه پرداخت‌ها را نگه دارید.');
  return {...next,cloud};
}

export function reconcile(ledger,documents) {
  const next=clone(ledger), cloud=next.cloud;
  const local=new Map(next.customers.map(c=>[c.id,c]));
  const remote=new Map(documents.map(d=>[d.value.id,d]));
  for(const id of new Set([...local.keys(),...remote.keys(),...Object.keys(cloud.base)])) {
    // Keep unresolved originals stable. A later remote revision is checked
    // again against the chosen version after explicit resolution.
    if(cloud.conflicts[id])continue;
    const l=local.get(id), r=remote.get(id), b=cloud.base[id]?.value;
    const result=mergeCustomer(b,l,r?.value,next.currency);
    if(result.conflicts.length) {
      cloud.conflicts[id]={base:clone(b)||null,local:clone(l)||null,remote:clone(r?.value)||null,paths:result.conflicts,at:new Date().toISOString()};
      cloud.pending[id] ||= uid();
      continue;
    }
    if(result.value)local.set(id,result.value);else local.delete(id);
    if(r)cloud.base[id]=clone(r);else delete cloud.base[id];
    if(!equal(result.value,r?.value))cloud.pending[id] ||= uid();else delete cloud.pending[id];
  }
  next.customers=[...local.values()];
  validateLedger(next);
  return next;
}

export function resolveConflict(ledger,id,choice) {
  if(!['local','remote'].includes(choice))throw Error('نسخه مورد نظر را انتخاب کنید.');
  const next=clone(ledger), conflict=next.cloud.conflicts[id];
  if(!conflict)throw Error('این اختلاف قبلاً بررسی شده است.');
  const chosen=conflict[choice];
  if(!chosen)throw Error('این نسخه موجود نیست؛ برای جلوگیری از حذف حساب، نسخه دیگر را انتخاب کنید.');
  const decision={...conflict,id,choice,resolvedAt:new Date().toISOString()};
  next.cloud.resolutions.push(decision);
  // Keep the rejected originals with the customer so all devices and future
  // backups retain the review history. Avoid recursively nesting old archives.
  const snapshot=value=>{if(!value)return null;const {syncResolutions,...rest}=value;return rest;};
  const archived={...decision,base:snapshot(decision.base),local:snapshot(decision.local),remote:snapshot(decision.remote)};
  const resolved={...clone(chosen),syncResolutions:[...(chosen.syncResolutions||[]),archived]};
  next.customers=next.customers.filter(c=>c.id!==id).concat(resolved);
  // Baseline is the reviewed remote, but its update time is obtained fresh.
  // A concurrent remote change therefore cannot be overwritten by resolution.
  if(conflict.remote)next.cloud.base[id]={value:clone(conflict.remote),updateTime:null};
  else delete next.cloud.base[id];
  delete next.cloud.conflicts[id];next.cloud.pending[id]=uid();
  validateLedger(next);return next;
}

export function backupLedger(ledger) {
  // Remote baselines and upload queue are device-specific. Originals retained
  // for conflict decisions remain available in the portable backup.
  const {cloud,...business}=ledger;
  if(cloud?.resolutions?.length)business.syncResolutionHistory=clone(cloud.resolutions);
  if(cloud && Object.keys(cloud.conflicts).length)business.unresolvedSyncConflicts=clone(cloud.conflicts);
  return business;
}
