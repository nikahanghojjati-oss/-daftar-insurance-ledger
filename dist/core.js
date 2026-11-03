export const VERSION = 2;
export const CURRENCIES = { toman: 'تومان', rial: 'ریال' };
export const MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const persian = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', { year:'numeric', month:'numeric', day:'numeric', timeZone:'UTC' });
const DAY = 86400000;
export const digits = value => String(value ?? '').replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
export const fa = value => String(value).replace(/\d/g,c=>'۰۱۲۳۴۵۶۷۸۹'[+c]);
export const normalize = value => digits(value).replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[\s\u200c\u200e\u200f-]+/g,'').toLowerCase();
export const uid = () => {
  if(globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
  const bytes=globalThis.crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
};
export const money = n => new Intl.NumberFormat('fa-IR', { maximumFractionDigits:0 }).format(n);
export function amount(value) {
  const s = digits(value).replace(/[,٬\s]/g,'');
  if (!/^\d+$/.test(s)) throw new Error('مبلغ را با عدد صحیح و بدون اعشار وارد کنید.');
  const n = Number(s);
  if (!Number.isSafeInteger(n) || n > 1e12) throw new Error('مبلغ باید کمتر از ۱٬۰۰۰ میلیارد باشد.');
  return n;
}
export function jparts(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error('تاریخ معتبر نیست.');
  const d = new Date(iso+'T12:00:00Z');
  if (isNaN(+d) || d.toISOString().slice(0,10)!==iso) throw new Error('تاریخ معتبر نیست.');
  const p = Object.fromEntries(persian.formatToParts(d).filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
  return {y:p.year,m:p.month,d:p.day};
}
export function fromJalali(y,m,d) {
  if (![y,m,d].every(Number.isInteger) || y<1300 || y>1500 || m<1 || m>12 || d<1 || d>31) throw new Error('تاریخ شمسی معتبر نیست. مانند ۱۴۰۵/۰۸/۱۰ وارد کنید.');
  const offset = m<=7 ? (m-1)*31 : 186+(m-7)*30;
  const guess = Date.UTC(y+621,2,20)+(offset+d-1)*DAY;
  for(let delta=-3;delta<=3;delta++) {
    const iso = new Date(guess+delta*DAY).toISOString().slice(0,10);
    const p = jparts(iso);
    if(p.y===y && p.m===m && p.d===d) return iso;
  }
  throw new Error('این روز در تقویم شمسی وجود ندارد.');
}
export function parseDate(value) {
  const parts=digits(value).trim().replace(/[-.]/g,'/').split('/');
  if(parts.length!==3 || parts.some(p=>!/^\d+$/.test(p))) throw new Error('تاریخ را به شکل سال/ماه/روز بنویسید؛ مانند ۱۴۰۵/۰۸/۱۰.');
  return fromJalali(...parts.map(Number));
}
export function dateInput(iso) {
  const p=jparts(iso);return fa(`${p.y}/${String(p.m).padStart(2,'0')}/${String(p.d).padStart(2,'0')}`);
}
export function dateLabel(iso,year=true) {
  const p=jparts(iso); return `${fa(p.d)} ${MONTHS[p.m-1]}${year?' '+fa(p.y):''}`;
}
export function today() {
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const a=Object.fromEntries(p.map(x=>[x.type,x.value]));return `${a.year}-${a.month}-${a.day}`;
}
export const addDays=(iso,n)=>new Date(Date.parse(iso+'T12:00:00Z')+n*DAY).toISOString().slice(0,10);
export function addMonths(iso,n) {
  const p=jparts(iso),index=(p.y*12+p.m-1)+n,y=Math.floor(index/12),m=index%12+1;
  for(let d=p.d;d>=1;d--) {try{return fromJalali(y,m,d);}catch{}}
  throw new Error('تاریخ قسط خارج از محدوده مجاز است.');
}
export function makePolicy(input) {
  const total=amount(input.total),down=amount(input.down || '0'),count=amount(input.count || '1');
  if(total<=0) throw new Error('مبلغ کل بیمه باید بیشتر از صفر باشد.');
  if(down>total) throw new Error('پیش‌پرداخت نمی‌تواند بیشتر از مبلغ کل باشد.');
  if(count<1 || count>120) throw new Error('تعداد اقساط باید بین ۱ تا ۱۲۰ باشد.');
  if(!['monthly','weekly'].includes(input.frequency)) throw new Error('دوره قسط معتبر نیست.');
  const remaining=total-down;
  if(remaining>0 && count>remaining) throw new Error('مبلغ هر قسط باید دست‌کم یک واحد باشد.');
  const first=parseDate(input.firstDate),paymentDate=parseDate(input.paymentDate || dateInput(today()));
  if(down && paymentDate>today()) throw new Error('تاریخ پرداخت واقعی نباید در آینده باشد.');
  const installments=[],payments=[];
  if(down) {
    installments.push({id:uid(),dueDate:paymentDate,amount:down,kind:'down'});
    payments.push({id:uid(),amount:down,date:paymentDate,note:'پیش‌پرداخت'});
  }
  if(remaining) {
    const base=Math.floor(remaining/count);
    for(let i=0;i<count;i++) installments.push({id:uid(),dueDate:input.frequency==='weekly'?addDays(first,i*7):addMonths(first,i),amount:i===count-1?remaining-base*(count-1):base,kind:'regular'});
  }
  installments.sort((a,b)=>a.dueDate.localeCompare(b.dueDate) || (a.kind==='down'?-1:1));
  return {id:uid(),title:String(input.title||'بیمه‌نامه').trim().slice(0,100),number:String(input.number||'').trim().slice(0,80),total,frequency:input.frequency,installments,payments};
}
export function policySummary(policy,asOf=today()) {
  const paid=policy.payments.filter(p=>!p.voidedAt).reduce((sum,p)=>sum+p.amount,0);let credit=paid;
  const schedule=policy.installments.map(i=>{
    const applied=Math.min(credit,i.amount); credit-=applied;
    const left=i.amount-applied;
    return {...i,paid:applied,left,status:left===0?'paid':i.dueDate<asOf?'overdue':i.dueDate===asOf?'today':'upcoming'};
  });
  const pending=schedule.filter(i=>i.left>0),overdue=pending.filter(i=>i.dueDate<asOf);
  return {total:policy.total,paid,owed:policy.total-paid,schedule,pending,overdue:overdue.reduce((s,i)=>s+i.left,0),next:pending[0]||null};
}
export function customerSummary(customer,asOf=today()) {
  const policies=customer.policies.map(p=>policySummary(p,asOf));
  return {total:policies.reduce((s,p)=>s+p.total,0),paid:policies.reduce((s,p)=>s+p.paid,0),owed:policies.reduce((s,p)=>s+p.owed,0),overdue:policies.reduce((s,p)=>s+p.overdue,0),next:policies.map(p=>p.next).filter(Boolean).sort((a,b)=>a.dueDate.localeCompare(b.dueDate))[0]||null};
}
export function ledgerSummary(data,asOf=today()) {
  return data.customers.map(c=>customerSummary(c,asOf)).reduce((s,c)=>({total:s.total+c.total,paid:s.paid+c.paid,owed:s.owed+c.owed,overdue:s.overdue+c.overdue}),{total:0,paid:0,owed:0,overdue:0});
}
export function dueItems(data,asOf=today()) {
  return data.customers.flatMap(c=>c.policies.flatMap(p=>policySummary(p,asOf).pending.map(i=>({...i,customerId:c.id,customerName:c.name,policyId:p.id,title:p.title})))).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)||a.customerName.localeCompare(b.customerName,'fa'));
}
export function recordPayment(policy,input,asOf=today()) {
  const value=amount(input.amount),date=parseDate(input.date),owed=policySummary(policy,asOf).owed;
  const previous=input.id&&policy.payments.find(p=>p.id===input.id);
  if(previous) {
    if(previous.amount!==value||previous.date!==date)throw new Error('شناسه این پرداخت قبلاً استفاده شده است. فرم پرداخت تازه‌ای باز کنید.');
    return policy;
  }
  if(value<=0) throw new Error('مبلغ پرداخت باید بیشتر از صفر باشد.');
  if(value>owed) throw new Error('مبلغ پرداخت بیشتر از مانده این بیمه‌نامه است.');
  if(date>asOf) throw new Error('پرداخت آینده را نمی‌توان به عنوان دریافت واقعی ثبت کرد.');
  return {...policy,payments:[...policy.payments,{id:input.id||uid(),amount:value,date,note:String(input.note||'').trim().slice(0,500),createdAt:new Date().toISOString()}]};
}
export function similarPayments(policy,input) {
  const value=amount(input.amount),date=parseDate(input.date);
  return policy.payments.filter(p=>!p.voidedAt&&p.id!==input.id&&p.amount===value&&p.date===date);
}
export function voidPayment(policy,id,at=new Date().toISOString()) {
  const payment=policy.payments.find(p=>p.id===id);
  if(!payment||payment.voidedAt)throw new Error('این پرداخت قبلاً لغو شده یا پیدا نشد.');
  return {...policy,payments:policy.payments.map(p=>p.id===id?{...p,voidedAt:at,revisions:[...(p.revisions||[]),{action:'void',at}]}:p)};
}
export function restorePayment(policy,id,at=new Date().toISOString()) {
  const payment=policy.payments.find(p=>p.id===id);
  if(!payment?.voidedAt)throw new Error('این پرداخت لغو نشده است.');
  if(payment.amount>policySummary(policy).owed)throw new Error('برگرداندن این پرداخت از مانده حساب بیشتر می‌شود. ابتدا پرداخت جایگزین را بررسی کنید.');
  return {...policy,payments:policy.payments.map(p=>{if(p.id!==id)return p;const {voidedAt,...rest}=p;return {...rest,revisions:[...(p.revisions||[]),{action:'restore',at}]};})};
}
export function validateLedger(data) {
  const fail=()=>{throw new Error('فایل پشتیبان معتبر نیست یا نسخه آن پشتیبانی نمی‌شود. اطلاعات فعلی تغییر نکرد.');};
  if(!data || ![1,VERSION].includes(data.schemaVersion) || !Object.hasOwn(CURRENCIES,data.currency) || !Array.isArray(data.customers) || data.customers.length>10000) fail();
  const ids=new Set();
  const id=v=>{if(typeof v!=='string'||v.length<1||v.length>100||ids.has(v))fail();ids.add(v);};
  const str=(v,max)=>{if(typeof v!=='string'||v.length>max)fail();};
  const num=v=>{if(!Number.isSafeInteger(v)||v<1||v>1e12)fail();};
  const iso=v=>{try{const p=jparts(v);if(p.y<1300||p.y>1500)fail();}catch{fail();}};
  const timestamp=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(v)||!Number.isFinite(Date.parse(v)))fail();};
  if(data.revision!==undefined)str(data.revision,100);
  if(data.updatedAt!==undefined)timestamp(data.updatedAt);
  for(const c of data.customers) {
    id(c.id);str(c.name,100);if(!c.name.trim())fail();str(c.phone,30);str(c.notes,1000);
    if(c.revisions!==undefined){if(!Array.isArray(c.revisions)||c.revisions.length>1000)fail();for(const r of c.revisions){timestamp(r.at);str(r.name,100);str(r.phone,30);str(r.notes,1000);}}
    if(!Array.isArray(c.policies)||c.policies.length>1000)fail();
    for(const p of c.policies) {
      id(p.id);str(p.title,100);str(p.number,80);num(p.total);if(!['weekly','monthly'].includes(p.frequency))fail();
      if(!Array.isArray(p.installments)||!p.installments.length||p.installments.length>121||!Array.isArray(p.payments)||p.payments.length>10000)fail();
      let sum=0,previous='';
      for(const i of p.installments) {id(i.id);num(i.amount);iso(i.dueDate);if(!['down','regular'].includes(i.kind)||i.dueDate<previous)fail();previous=i.dueDate;sum+=i.amount;}
      if(sum!==p.total)fail();let paid=0;
      for(const pmt of p.payments) {
        id(pmt.id);num(pmt.amount);iso(pmt.date);if(pmt.date>today())fail();str(pmt.note,500);
        if(pmt.createdAt!==undefined)timestamp(pmt.createdAt);
        if(pmt.voidedAt!==undefined){if(data.schemaVersion===1)fail();timestamp(pmt.voidedAt);}
        if(pmt.revisions!==undefined){
          if(data.schemaVersion===1||!Array.isArray(pmt.revisions)||pmt.revisions.length>1000)fail();
          let cancelled=false;
          for(const r of pmt.revisions){timestamp(r.at);if(r.action===(cancelled?'restore':'void'))cancelled=!cancelled;else fail();}
          if(cancelled!==Boolean(pmt.voidedAt))fail();
        }
        if(!pmt.voidedAt)paid+=pmt.amount;
      }
      if(paid>p.total)fail();
    }
  }
  return data.schemaVersion===1?{...data,schemaVersion:VERSION}:data;
}
export function emptyLedger(currency) { return {schemaVersion:VERSION,currency,customers:[]}; }
export function demoLedger() {
  const t=today(),d=emptyLedger('toman');
  const samples=[['مریم احمدی','۰۹۱۲ ۰۰۰ ۰۰۰۱','بیمه شخص ثالث','نمونه ۱۰۱',12000000,3000000,-38,4,'monthly'],['رضا محمدی','۰۹۱۲ ۰۰۰ ۰۰۰۲','بیمه بدنه خودرو','نمونه ۱۰۲',18000000,6000000,3,6,'monthly'],['سارا کریمی','۰۹۱۲ ۰۰۰ ۰۰۰۳','بیمه عمر','نمونه ۱۰۳',8000000,2000000,0,6,'weekly'],['علی رضایی','۰۹۱۲ ۰۰۰ ۰۰۰۴','بیمه آتش‌سوزی','نمونه ۱۰۴',5000000,5000000,10,1,'monthly']];
  for(const [name,phone,title,number,total,down,offset,count,frequency] of samples) {
    const p=makePolicy({title,number,total:String(total),down:String(down),firstDate:dateInput(addDays(t,offset)),paymentDate:dateInput(addDays(t,-45)),count:String(count),frequency});
    d.customers.push({id:uid(),name,phone,notes:'این پرونده و شماره تلفن، ساختگی و برای آشنایی با برنامه است.',policies:[p]});
  }
  return d;
}
