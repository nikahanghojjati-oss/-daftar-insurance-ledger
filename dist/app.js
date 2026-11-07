import {prepareOffline} from './offline.js';
import {verifyClock} from './clock.js';
import {LedgerSync,withLedgerLock,queueChanges,backupLedger,stampBusinessRevision} from './sync.js';
import {explainLoginFailure} from './firebase-rest.js';
import {inspectFirebaseConnection} from './connectivity.js';
import {CURRENCIES,MONTHS,digits,fa,normalize,money,amount,uid,today,addDays,firstInsuranceDue,dateInput,dateLabel,parseDate,makePolicy,reviseSchedule,recordPayment,similarPayments,voidPayment,restorePayment,policySummary,customerSummary,ledgerSummary,dueItems,validateLedger,emptyLedger,demoLedger} from './core.js';

const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={home:'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m8-7.87a4 4 0 0 1 0 7.75',calendar:'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2',backup:'M12 3v12m-4-4 4 4 4-4M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5',plus:'M12 5v14M5 12h14',search:'M21 21l-5-5M18 10.5a7.5 7.5 0 1 0-15 0 7.5 7.5 0 0 0 15 0',arrow:'m9 5 7 7-7 7',check:'m5 12 4 4L19 6',wallet:'M3 6h16v15H3V6Zm0 0 14-3v3m-2 7h6v4h-6Z',clock:'M12 8v4l3 2m6-2a9 9 0 1 0-18 0 9 9 0 0 0 18 0',shield:'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7ZM8 12l3 3 5-6',info:'M12 11v6m0-10v.01m9 5a9 9 0 1 0-18 0 9 9 0 0 0 18 0',close:'m6 6 12 12M6 18 18 6',edit:'m16 3 5 5-13 13H3v-5ZM14 5l5 5',phone:'M4 3h4l2 5-3 2c2 4 3 5 7 7l2-3 5 2v4c-9 3-20-8-17-17Z',book:'M4 3h15a1 1 0 0 1 1 1v17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm4 0v18m4-13h4m-4 4h4',file:'M14 2H5v20h14V7Zm0 0v6h5M8 12h8m-8 4h5',help:'M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 4v.01m9-5a9 9 0 1 0-18 0 9 9 0 0 0 18 0'};
const icon=(n,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[n]||paths.file}"/></svg>`;
const STORE={demo:'daftar.demo.v1',own:'daftar.ledger.v1'},MODE='daftar.mode.v1';
let mode='demo',data,baseRaw=null,storageOK=true,corrupt=false,view='home',selected=null,query='',filter='all',dueFilter='all',offlineReady=false,offlineIssue=false,offlineBusy=false,offlineMessage='در حال بررسی آفلاین…',offlineDetail='',importCandidate=null,toastTimer,shownDay=today(),clockVerified=false,lastClockCheck=0,clockBusy=false;
try{mode=localStorage.getItem(MODE)==='own'?'own':'demo';const raw=localStorage.getItem(STORE[mode]);if(raw){data=validateLedger(JSON.parse(raw));baseRaw=raw;}else if(mode==='demo'){data=demoLedger();baseRaw=JSON.stringify(data);localStorage.setItem(STORE.demo,baseRaw);}else{mode='demo';data=demoLedger();baseRaw=JSON.stringify(data);localStorage.setItem(STORE.demo,baseRaw);}localStorage.setItem('daftar.storage-check','1');localStorage.removeItem('daftar.storage-check');}catch(e){storageOK=false;try{corrupt=!!localStorage.getItem(STORE[mode]);}catch{}data=demoLedger();}
function readOwn(){const raw=localStorage.getItem(STORE.own);return raw?validateLedger(JSON.parse(raw)):null;}
function ownConnected(){try{return !!readOwn()?.cloud;}catch{return false;}}
let syncTimer;
const sync = new LedgerSync({read:readOwn,write:next=>{
  if($('#dialog').open && $('#dialog').querySelector('#customer-form,#policy-form,#payment-form,#schedule-form'))throw Error('FORM_IN_PROGRESS');
  next=stampBusinessRevision(readOwn(),next);
  const raw=JSON.stringify(next);localStorage.setItem(STORE.own,raw);
  if(mode==='own'){data=next;baseRaw=raw;}
},changed:()=>{if(typeof data!=='undefined' && !$('#dialog').open)render();}});
let syncFullRequested=false;
function scheduleSync(full=true){syncFullRequested ||= full;clearTimeout(syncTimer);syncTimer=setTimeout(()=>{const requested=syncFullRequested;syncFullRequested=false;try{if(readOwn()?.cloud)sync.run({full:requested});}catch{sync.state('error','اطلاعات محلی قابل خواندن نیست؛ پشتیبان را بررسی کنید.');}},700);}
const currency=()=>CURRENCIES[data.currency],cash=n=>`${money(n)} <small>${currency()}</small>`;
const button=(label,action,cls='primary',ico='plus',attrs='')=>`<button class="btn ${cls}" data-action="${action}" ${attrs}>${ico?icon(ico):''}${label}</button>`;
const badge=(text,type='neutral')=>`<span class="badge ${type}">${text}</span>`;
const status=c=>c.owed===0?badge('تسویه‌شده','green'):c.overdue>0?badge('قسط عقب‌افتاده','red'):badge('در حال پرداخت','blue');
const navs=[['home','home','خانه'],['customers','users','مشتریان'],['dues','calendar','سررسید اقساط'],['backup','backup','پشتیبان']];
function toast(message,error=false){const t=$('#toast');t.textContent=message;t.className=error?'show error':'show';clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.className='',5500);}
async function commit(next){
 const expectedRaw=baseRaw,expectedMode=mode,previous=data;
 const lock=navigator.locks||previous.cloud?withLedgerLock:task=>task();
 return lock(()=>{
  if(mode!==expectedMode)throw Error('دفتر فعال تغییر کرد؛ دوباره تلاش کنید.');
  if(!storageOK||corrupt)throw new Error('ذخیره‌سازی دستگاه در دسترس نیست. ابتدا مشکل ذخیره‌سازی یا فایل پشتیبان را بررسی کنید.');
  next=queueChanges(previous,next);
  validateLedger(next);
  if(localStorage.getItem(STORE[mode])!==expectedRaw){reloadData();throw new Error('دفتر در پنجره دیگری تغییر کرده است. اطلاعات تازه شد؛ دوباره تلاش کنید.');}
  next=stampBusinessRevision(previous,next);
  const raw=JSON.stringify(next);
  try{localStorage.setItem(STORE[mode],raw);}catch{throw new Error('اطلاعات ذخیره نشد. فضای دستگاه را بررسی کنید و دوباره تلاش کنید.');}
  data=next;baseRaw=raw;
  scheduleSync(false);
 });
}
async function mutate(fn){const next=structuredClone(data);fn(next);await commit(next);}
function reloadData(){try{const raw=localStorage.getItem(STORE[mode]);if(!raw)throw Error();data=validateLedger(JSON.parse(raw));baseRaw=raw;closeDialog();render();}catch{corrupt=true;render();}}
function switchMode(next){
  if(next==='own'&&!localStorage.getItem(STORE.own)){setup();return;}
  try{const raw=localStorage.getItem(STORE[next]);data=validateLedger(JSON.parse(raw));baseRaw=raw;mode=next;localStorage.setItem(MODE,next);view='home';query='';filter='all';closeDialog();render();}catch{toast('باز کردن دفتر ممکن نشد. پشتیبان را بررسی کنید.',true);}
}
function go(next,id=null){view=next;selected=id;query='';filter='all';render();window.scrollTo({top:0,behavior:'instant'});$('#main')?.focus({preventScroll:true});}
function render(){
  const title=view==='profile'?'پرونده مشتری':navs.find(n=>n[0]===view)?.[2]||'خانه';shownDay=today();
  $('#app').innerHTML=`<aside class="sidebar"><a class="brand" href="#" data-action="home"><span class="brand-mark">${icon('book')}</span><span>دفتر<small>حساب روشن، خیال آسوده</small></span></a><div class="nav-label">دفتر کار شما</div><nav aria-label="منوی اصلی">${navs.map(([id,ico,label])=>`<button data-action="nav" data-view="${id}" class="nav-item ${(view===id||(view==='profile'&&id==='customers'))?'active':''}" ${view===id?'aria-current="page"':''}>${icon(ico)}<span>${label}</span>${id==='dues'&&dueItems(data).some(i=>i.status==='overdue')?'<span class="nav-dot"></span>':''}</button>`).join('')}</nav><div class="sidebar-bottom"><div class="local-note">${icon('shield')}<div><b>اطلاعات روی همین دستگاه</b><span>${mode==='own'&&data.cloud?'همگام‌سازی خصوصی فعال':'همگام‌سازی هنوز متصل نیست'}</span></div></div><button class="help-link" data-action="help">${icon('help')}راهنمای استفاده</button><div class="sidebar-user"><span class="avatar mini">${icon('book')}</span><div><b>${mode==='demo'?'دفتر نمونه':'دفتر شخصی من'}</b><span>حساب مشتریان بیمه</span></div><span class="private-tag">روی دستگاه</span></div></div></aside>
  <div class="workspace"><header class="topbar"><span class="crumb">دفتر <span>/</span> <strong>${title}</strong></span><div class="topbar-right"><span id="connection" class="connection">${connectionText()}</span><span class="today">${icon('calendar')}<span id="today-label">${dateLabel(shownDay)}</span><small id="clock-status">${clockVerified?'تاریخ آنلاین بررسی شد':'ساعت دستگاه · در انتظار بررسی آنلاین'}</small></span></div></header><main id="main" tabindex="-1">
  ${corrupt?recoveryView():`${saveStrip()}${cloudStrip()}${draftBanner()}${!storageOK?'<div class="alert red">ذخیره‌سازی مرورگر فعال نیست. ثبت اطلاعات غیرفعال است؛ از مرورگر عادی و فضای کافی استفاده کنید.</div>':''}${mode==='demo'?`<div class="demo-banner"><span>${icon('info')}<span><b>این دفتر نمونه است.</b> با اطلاعات ساختگی تمرین کنید.</span></span>${button('شروع دفتر خودم','setup','light','arrow')}</div>`:''}${view==='home'?homeView():view==='customers'?customersView():view==='dues'?duesView():view==='backup'?backupView():profileView()}`}
  <footer class="footer"><span>${icon('shield')}اطلاعات روی همین دستگاه · بدون نیاز به ورود</span><span>همه مبلغ‌ها به ${currency()} · تاریخ‌ها شمسی</span></footer></main></div>
  <nav class="mobile-nav" aria-label="منوی تلفن">${navs.map(([id,ico,label])=>`<button data-action="nav" data-view="${id}" class="${view===id||(view==='profile'&&id==='customers')?'active':''}">${icon(ico)}<span>${id==='dues'?'اقساط':label}</span></button>`).join('')}</nav>`;
}
function connectionText(){return `<span class="status-dot ${offlineReady?'ready':''}"></span>${offlineReady?(navigator.onLine?'آماده استفاده آفلاین':'آفلاین · آماده استفاده'):offlineIssue?'<button class="offline-status-btn" data-action="offline-help">آفلاین آماده نشد · بررسی</button>':esc(offlineMessage)}`;}
function offlineDescription(){return offlineReady?'نسخه آفلاین و فونت روی این دستگاه آماده‌اند؛ می‌توانید اینترنت را قطع کنید.':offlineIssue?offlineMessage:offlineMessage;}
function offlineActions(){return offlineReady?'':button(offlineBusy?'در حال آماده‌سازی…':'تلاش دوباره برای آفلاین','retry-offline','secondary','clock',offlineBusy?'disabled':'');}
function showOfflineHelp(){openDialog(`${modalTitle('استفاده بدون اینترنت','آماده شدن برنامه با ذخیره حساب‌ها دو کار جداست.')}<p>${esc(offlineDescription())}</p><p>لینک دفتر را مستقیم در Chrome یا Safari باز کنید. پس از دیدن «آماده استفاده آفلاین»، اینترنت را قطع کنید و صفحه را دوباره باز کنید.</p><p>حساب‌های ثبت‌شده در مرورگر همین دستگاه نگه داشته می‌شوند. فایل پشتیبان را هم جداگانه دریافت کنید.</p>${offlineDetail?`<details class="offline-details"><summary>جزئیات مشکل</summary><p dir="ltr">${esc(offlineDetail)}</p></details>`:''}<div class="form-actions">${offlineActions()}${button('بستن','close','light','close')}</div>`);}

function heading(eyebrow,title,description,action=''){return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>${action}</div>`;}
function stats(summary,profile=false){return `<div class="stats"><section class="stat owed"><div class="stat-label">${icon('wallet')}مانده قابل دریافت</div><div class="stat-value">${cash(summary.owed)}</div><div class="stat-foot">${summary.overdue?`<span class="overdue-dot"></span>${money(summary.overdue)} ${currency()} از سررسید گذشته`:'مانده حساب همه اقساط باز'}</div><span class="stat-art">${icon('wallet')}</span></section><section class="stat"><div class="stat-label">${icon('check')}مجموع پرداخت‌شده</div><div class="stat-value green-text">${cash(summary.paid)}</div><div class="stat-foot">فقط پرداخت‌های ثبت‌شده</div></section><section class="stat"><div class="stat-label">${icon(profile?'file':'users')}${profile?'مبلغ کل بیمه‌نامه‌ها':'مشتریان دفتر'}</div><div class="stat-value">${profile?cash(summary.total):`${money(data.customers.length)} <small>نفر</small>`}</div><div class="stat-foot">${profile?'مبلغ قراردادها پیش از پرداخت':`${money(data.customers.filter(c=>customerSummary(c).owed===0&&c.policies.length).length)} مشتری تسویه‌شده`}</div></section></div>`;}
function dailyDues(items,day){return `<section class="daily-dues" aria-label="اقساط امروز و فردا">${[['today','امروز',day],['tomorrow','فردا',addDays(day,1)]].map(([id,label,date])=>{const pending=items.filter(i=>i.dueDate===date),left=pending.reduce((sum,i)=>sum+i.left,0);return `<button class="daily-due daily-due-${id}" data-action="open-dues" data-filter="${id}"><span class="daily-due-top"><span>اقساط ${label}</span><span class="daily-due-count">${money(pending.length)} قسط</span></span><span class="daily-due-date">${dateLabel(date,false)}</span><strong class="daily-due-amount">${cash(left)}</strong><span class="daily-due-link">${pending.length?'مشاهده اقساط':'قسط باز ندارید'} ${icon('arrow')}</span></button>`;}).join('')}</section>`;}
function homeView(){const day=today(),summary=ledgerSummary(data,day),items=dueItems(data,day),due=items.filter(i=>i.dueDate<=addDays(day,7)).slice(0,4);
  return heading('مدیریت حساب مشتریان بیمه','نمای کلی دفتر', 'وضعیت پرداخت‌ها، مانده حساب و سررسیدها در یک نگاه.',button('مشتری جدید','add-customer'))+dailyDues(items,day)+stats(summary)+
  `<div class="home-grid"><section class="panel customer-panel"><div class="panel-head"><div><h2>مشتریان شما <span class="count">${money(data.customers.length)}</span></h2><p>برای دیدن حساب، روی نام مشتری بزنید.</p></div><button class="text-btn" data-action="nav" data-view="customers">همه مشتریان ${icon('arrow')}</button></div>${searchBox()}<div id="customer-results">${customerRows(true)}</div></section><aside class="panel due-panel"><div class="panel-head"><div><span class="section-icon">${icon('calendar')}</span><h2>وقت پرداخت</h2><p>اقساط عقب‌افتاده و ۷ روز آینده</p></div></div>${due.length?due.map(dueCard).join(''):emptyBlock('calendar','قسط نزدیک ندارید','سررسیدهای بعدی را در بخش اقساط ببینید.')}<button class="due-bottom" data-action="nav" data-view="dues">دیدن همه سررسیدها ${icon('arrow')}</button></aside></div>
  <div class="tip-strip">${icon('book')}<span><b>دفترتان همیشه همراه شماست.</b> <span id="offline-tip">${esc(offlineDescription())}</span></span><button data-action="nav" data-view="backup">تهیه پشتیبان ${icon('arrow')}</button></div>`;
}
function searchBox(){return `<label class="search">${icon('search')}<input id="customer-search" type="search" placeholder="جست‌وجوی نام، تلفن یا شماره بیمه‌نامه…" aria-label="جست‌وجوی مشتری" value="${esc(query)}" autocomplete="off"><kbd>جست‌وجو</kbd></label>`;}
function filteredCustomers(){return data.customers.filter(c=>{const s=customerSummary(c),matches=normalize([c.name,c.phone,...c.policies.map(p=>p.number)].join(' ')).includes(normalize(query));return matches&&(filter==='all'||filter==='overdue'&&s.overdue>0||filter==='owed'&&s.owed>0||filter==='paid'&&s.owed===0&&c.policies.length>0);});}
function customerRows(compact=false){const customers=filteredCustomers();
  if(!customers.length)return emptyBlock('users',query?'مشتری پیدا نشد':data.customers.length?'در این دسته مشتری ندارید':'اولین مشتری را اضافه کنید',query?'نام، شماره تلفن یا شماره بیمه‌نامه دیگری جست‌وجو کنید.':'برای هر مشتری یک پرونده و برنامه اقساط بسازید.',!data.customers.length?button('افزودن مشتری','add-customer','primary','plus'):'');
  return `<div class="table-wrap"><table class="customer-table"><thead><tr><th>نام مشتری</th><th>مانده حساب</th><th class="optional-col">قسط بعدی</th><th>وضعیت</th><th class="arrow-cell"><span class="sr-only">پرونده</span></th></tr></thead><tbody>${customers.slice(0,compact?6:10000).map((c,i)=>{const s=customerSummary(c);return `<tr><td><button class="customer-name" data-action="profile" data-id="${esc(c.id)}"><span class="avatar tone-${i%4}">${esc(c.name.trim().slice(0,1))}</span><span><b>${esc(c.name)}</b><small dir="ltr">${esc(fa(c.phone))||'بدون شماره تلفن'}</small></span></button></td><td class="amount-cell">${cash(s.owed)}</td><td class="optional-col next-date">${s.next?dateLabel(s.next.dueDate,false):'—'}</td><td>${c.policies.length?status(s):badge('بدون بیمه‌نامه')}</td><td class="arrow-cell"><button class="icon-btn" data-action="profile" data-id="${esc(c.id)}" aria-label="پرونده ${esc(c.name)}">${icon('arrow')}</button></td></tr>`;}).join('')}</tbody></table></div>`;
}
function customersView(){return heading('حساب مشتریان','مشتریان', 'نام مشتری را جست‌وجو کنید و پرونده او را باز کنید.',button('مشتری جدید','add-customer'))+`<section class="panel">${searchBox()}<div class="filters" role="group" aria-label="وضعیت مشتریان">${[['all','همه مشتریان'],['owed','دارای بدهی'],['overdue','عقب‌افتاده'],['paid','تسویه‌شده']].map(([id,label])=>`<button data-action="filter" data-filter="${id}" class="chip ${filter===id?'selected':''}" aria-pressed="${filter===id}">${label}</button>`).join('')}</div><div id="customer-results">${customerRows()}</div></section>`;}
function dueCard(i){return `<button class="due-card" data-action="profile" data-id="${esc(i.customerId)}"><span class="date-tile ${i.status==='overdue'?'late':''}"><b>${fa(dateLabel(i.dueDate,false).split(' ')[0])}</b><small>${MONTHS[Number(digits(dateInput(i.dueDate)).split('/')[1])-1]}</small></span><span class="due-info"><b>${esc(i.customerName)}</b><small>${esc(i.title)}</small><strong>${cash(i.left)}</strong></span>${i.status==='overdue'?badge('عقب‌افتاده','red'):i.status==='today'?badge('امروز','gold'):icon('arrow')}</button>`;}
function duesView(){const day=today(),items=dueItems(data,day),visible=items.filter(i=>dueFilter==='all'||dueFilter==='today'&&i.dueDate===day||dueFilter==='tomorrow'&&i.dueDate===addDays(day,1)||dueFilter==='overdue'&&i.dueDate<day||dueFilter==='week'&&i.dueDate>=day&&i.dueDate<=addDays(day,7));return heading('هیچ قسطی از قلم نمی‌افتد','سررسید اقساط','مبلغ مانده هر قسط، پس از اعمال پرداخت‌ها نشان داده می‌شود.')+`<div class="filters due-filters" role="group" aria-label="زمان سررسید">${[['all','همه اقساط باز'],['today','اقساط امروز'],['tomorrow','اقساط فردا'],['overdue','عقب‌افتاده'],['week','امروز و ۷ روز آینده']].map(([id,label])=>`<button class="chip ${dueFilter===id?'selected':''}" data-action="due-filter" data-filter="${id}" aria-pressed="${dueFilter===id}">${label}</button>`).join('')}</div><section class="panel"><div class="panel-head"><div><h2>${money(visible.length)} قسط باز</h2><p>سررسیدها از قدیمی‌ترین به جدیدترین</p></div><span class="muted">${cash(visible.reduce((s,i)=>s+i.left,0))}</span></div>${visible.length?`<div class="due-list">${visible.map(dueCard).join('')}</div>`:emptyBlock('check','قسطی در این فهرست نیست','با ثبت بیمه‌نامه، سررسیدها اینجا نمایش داده می‌شوند.')}</section>`;}
function profileView(){const c=data.customers.find(c=>c.id===selected);if(!c){view='customers';return customersView();}const s=customerSummary(c);
  return `<button class="back-link" data-action="nav" data-view="customers">${icon('arrow')}بازگشت به مشتریان</button><div class="profile-heading"><span class="avatar large">${esc(c.name.slice(0,1))}</span><div><div class="eyebrow">پرونده مشتری</div><h1>${esc(c.name)}</h1><div class="profile-meta">${c.phone?`${icon('phone')}<span dir="ltr">${esc(fa(c.phone))}</span><span>·</span>`:''}${money(c.policies.length)} بیمه‌نامه</div></div><button class="btn secondary edit-customer" data-action="edit-customer" data-id="${esc(c.id)}">${icon('edit')}ویرایش اطلاعات</button></div>${c.notes?`<p class="customer-note">${icon('info')}${esc(c.notes)}</p>`:''}${stats(s,true)}<div class="section-heading"><h2>بیمه‌نامه‌ها و اقساط</h2>${button('بیمه‌نامه جدید','add-policy','primary','plus',`data-id="${esc(c.id)}"`)}</div>${c.policies.length?c.policies.map(p=>policyCard(c,p)).join(''):emptyBlock('file','یک بیمه‌نامه به پرونده اضافه کنید','مبلغ کل، پیش‌پرداخت و برنامه اقساط را وارد کنید.',button('افزودن بیمه‌نامه','add-policy','primary','plus',`data-id="${esc(c.id)}"`))}`;
}
function installmentBadge(i){return i.status==='paid'?badge('پرداخت‌شده','green'):i.status==='overdue'?badge(i.paid?'بخشی پرداخت · عقب‌افتاده':'عقب‌افتاده','red'):i.paid?badge('بخشی پرداخت‌شده','blue'):badge(i.status==='today'?'امروز':'در انتظار',i.status==='today'?'gold':'neutral');}
function policyCard(c,p){
  const s=policySummary(p),rows=s.schedule.map((i,n)=>({...i,label:i.kind==='down'?'پیش‌پرداخت':'قسط '+fa(s.schedule.slice(0,n+1).filter(x=>x.kind==='regular').length)}));
  return `<section class="panel policy-card"><div class="policy-head"><div class="policy-title"><span class="section-icon">${icon('file')}</span><div><h2>${esc(p.title)}</h2><p>شماره بیمه‌نامه: <bdi>${esc(fa(p.number))||'ثبت نشده'}</bdi> · ${p.frequency==='cash'?'تسویه نقدی':p.frequency==='month-plus-15'?'اقساط هر ۱ ماه شمسی و ۱۵ روز':p.frequency==='monthly'?'اقساط ماهانه شمسی':'اقساط هفتگی'}</p></div></div>${s.owed?button('ثبت پرداخت','pay','primary','plus',`data-customer="${esc(c.id)}" data-id="${esc(p.id)}"`):badge('تسویه کامل','green')}</div><div class="policy-totals"><div><span>مبلغ کل</span><b>${cash(s.total)}</b></div><div><span>پرداخت‌شده</span><b class="green-text">${cash(s.paid)}</b></div><div><span>مانده حساب</span><b>${cash(s.owed)}</b></div><div><span>سررسید پرداخت بعدی</span><b class="${s.overdue?'red-text':''}">${s.next?dateLabel(s.next.dueDate):'تسویه‌شده'}</b></div></div><div class="progress"><span style="width:${s.paid/s.total*100}%"></span></div>
  <details class="schedule" open><summary>برنامه اقساط <span>${money(s.pending.length)} قسط باقی‌مانده</span></summary>${p.frequency!=='cash'?`<button class="text-btn schedule-edit-btn" data-action="edit-schedule" data-customer="${esc(c.id)}" data-policy="${esc(p.id)}">ویرایش تاریخ و مبلغ اقساط</button>`:''}<div class="table-wrap desktop-schedule"><table><thead><tr><th>قسط</th><th>تاریخ سررسید</th><th>مبلغ قسط <small>(${currency()})</small></th><th>باقی‌مانده <small>(${currency()})</small></th><th>وضعیت</th></tr></thead><tbody>${rows.map(i=>`<tr><td>${i.label}</td><td>${dateLabel(i.dueDate)}</td><td>${money(i.amount)}</td><td>${money(i.left)}</td><td>${installmentBadge(i)}</td></tr>`).join('')}</tbody></table></div>
  <div class="mobile-schedule">${rows.map(i=>`<article class="installment-card"><div class="installment-title"><b>${i.label}</b>${installmentBadge(i)}</div><p>${icon('calendar')}${dateLabel(i.dueDate)}</p><dl><div><dt>مبلغ قسط</dt><dd>${cash(i.amount)}</dd></div><div><dt>باقی‌مانده</dt><dd>${cash(i.left)}</dd></div></dl></article>`).join('')}</div></details>
  <details class="history"><summary>سابقه پرداخت‌ها <span>${money(p.payments.filter(pmt=>!pmt.voidedAt).length)} پرداخت فعال${p.payments.some(pmt=>pmt.voidedAt)?' · '+money(p.payments.filter(pmt=>pmt.voidedAt).length)+' لغوشده':''}</span></summary>${p.payments.length?`<ul class="payment-history">${[...p.payments].reverse().map(pmt=>`<li class="${pmt.voidedAt?'void-payment':''}"><span class="history-check">${icon(pmt.voidedAt?'close':'check')}</span><div><b>${cash(pmt.amount)}</b><span>${dateLabel(pmt.date)}${pmt.note?' · '+esc(pmt.note):''}</span>${pmt.voidedAt?'<small>لغوشده · در جمع پرداخت‌ها حساب نمی‌شود</small>':pmt.revisions?.length?'<small>پس از لغو، دوباره فعال شده است</small>':''}</div><button class="text-btn ${pmt.voidedAt?'':'danger'}" data-action="${pmt.voidedAt?'restore-payment':'remove-payment'}" data-customer="${esc(c.id)}" data-policy="${esc(p.id)}" data-id="${esc(pmt.id)}">${pmt.voidedAt?'برگرداندن':'لغو ثبت'}</button></li>`).join('')}</ul>`:'<p class="empty-inline">هنوز پرداختی ثبت نشده است.</p>'}</details></section>`;
}
function emptyBlock(ico,title,text,action=''){return `<div class="empty-state"><span>${icon(ico)}</span><h3>${title}</h3><p>${text}</p>${action}</div>`;}
function backupView(){return cloudPanel()+heading('دفترتان را نگه دارید','پشتیبان و تنظیمات','یک نسخه از دفتر بگیرید تا در دستگاه دیگری هم بتوانید آن را باز کنید.')+`<div class="backup-grid"><section class="panel backup-card"><span class="big-icon">${icon('backup')}</span><h2>دریافت فایل پشتیبان</h2><p>همه مشتریان، بیمه‌نامه‌ها و پرداخت‌ها در یک فایل ذخیره می‌شوند.</p><div class="backup-meta">${money(data.customers.length)} مشتری · واحد ${currency()}${mode==='demo'?' · اطلاعات نمونه':''}</div>${button('دریافت پشتیبان','export','primary','backup')}<small id="last-backup">${lastBackup()}</small></section><section class="panel backup-card"><span class="big-icon sand">${icon('file')}</span><h2>بازگرداندن پشتیبان</h2><p>فایل دفتر قبلی را انتخاب کنید. پیش از جایگزینی، خلاصه آن را می‌بینید.</p><div class="backup-meta">فقط فایل JSON ساخته‌شده در این برنامه</div>${button('انتخاب فایل پشتیبان','import','secondary','file')}<input type="file" accept=".json,application/json" id="import-file" hidden></section></div>
  <section class="panel settings-card"><h2>دفتر فعلی</h2><dl><div><dt>نوع دفتر</dt><dd>${mode==='demo'?'نمونه (اطلاعات ساختگی)':'دفتر شخصی'}</dd></div><div><dt>واحد پول</dt><dd>${currency()} <small>بدون تبدیل خودکار واحد</small></dd></div><div><dt>آمادگی آفلاین</dt><dd id="offline-setting">${esc(offlineDescription())}</dd></div><div><dt>محل نگهداری</dt><dd>${mode==='own'&&data.cloud?'روی این دستگاه و دفتر آنلاین خصوصی؛ وضعیت همگام‌سازی را بررسی کنید.':'مرورگر همین دستگاه؛ اتصال آنلاین هنوز انجام نشده است.'}</dd></div></dl><div class="settings-actions">${offlineActions()}${mode==='demo'?button('شروع دفتر شخصی','setup','secondary','book'):button('تمرین در دفتر نمونه','demo','secondary','book')}${mode==='own'&&!data.customers.length?button('انتخاب دوباره واحد پول','currency','secondary','edit'):''}${button('راهنمای ساده','help','light','help')}</div></section><div class="backup-reminder">${icon('info')}پاک کردن داده‌های مرورگر یا استفاده از مرورگر خصوصی می‌تواند دفتر را از بین ببرد. پس از ثبت حساب‌ها پشتیبان بگیرید؛ فایل پشتیبان حاوی اطلاعات مشتریان است و باید نزد خودتان بماند.</div>`;}
function lastBackup(){try{const d=localStorage.getItem('daftar.backup.'+mode);return d?'آخرین فایل آماده‌شده: '+dateLabel(d):'پیشنهاد: پس از هر روز کاری پشتیبان بگیرید.';}catch{return '';}}
function recoveryView(){return `<section class="panel backup-card"><h1>اطلاعات دفتر قابل خواندن نیست</h1><p>برای جلوگیری از از دست رفتن اطلاعات، هیچ تغییری در دفتر ذخیره‌شده نداده‌ایم. فایل فعلی را برای بررسی دریافت کنید یا پشتیبان سالم را بازگردانید.</p>${button('دریافت اطلاعات فعلی','export-raw','secondary','backup')}${button('بازگرداندن پشتیبان سالم','import','primary','file')}<input type="file" accept=".json,application/json" id="import-file" hidden></section>`;}
function openDialog(content){const d=$('#dialog');d.innerHTML=`${content}<button class="dialog-close" data-action="close" aria-label="بستن">${icon('close')}</button>`;attachDraft(d.querySelector('form'));const discard=d.querySelector('[data-action="discard-draft"]');if(discard&&!d.querySelector('form')?.dataset.draftKey)discard.remove();if(!d.open)d.showModal();d.querySelector('[autofocus]')?.focus();}
function closeDialog(){if($('#dialog').open)$('#dialog').close();importCandidate=null;}
function modalTitle(title,subtitle){return `<div class="modal-head"><span class="eyebrow">${mode==='demo'?'تمرین در دفتر نمونه':'دفتر شخصی شما'}</span><h2 id="dialog-title">${title}</h2><p>${subtitle}</p></div>`;}
function formFooter(label){return `<p class="draft-status" id="draft-status" role="status"></p><div class="form-error" role="alert" id="form-error"></div><div class="form-actions"><button class="btn primary" type="submit">${icon('check')}${label}</button><button class="btn secondary" type="button" data-action="close">بستن</button><button class="text-btn" type="button" data-action="discard-draft">پاک کردن فرم ناتمام</button></div>`;}
function setup(change=false){if(change&&readOwn()?.cloud){toast('واحد پول دفتر متصل قابل تغییر نیست.',true);return;}if(!storageOK){toast('ذخیره‌سازی دستگاه فعال نیست.',true);return;}if(!change&&localStorage.getItem(STORE.own)){switchMode('own');return;}
  openDialog(`${modalTitle('دفتر خودتان را شروع کنید','واحدی را انتخاب کنید که با آن حساب می‌کنید. هیچ مبلغی تبدیل نمی‌شود.')}<form id="setup-form"><div class="currency-choices"><label><input type="radio" name="currency" value="toman" required><span><b>تومان</b><small>همه مبلغ‌ها به تومان وارد می‌شوند</small></span></label><label><input type="radio" name="currency" value="rial" required><span><b>ریال</b><small>همه مبلغ‌ها به ریال وارد می‌شوند</small></span></label></div><div class="form-note">${icon('shield')}دفتر از ابتدا خالی است. اطلاعات نمونه وارد دفتر شما نمی‌شود.</div>${formFooter('شروع دفتر شخصی')}</form>`);
}
function customerForm(id=null){const c=data.customers.find(c=>c.id===id);openDialog(`${modalTitle(c?'ویرایش مشتری':'افزودن مشتری','نام مشتری کافی است؛ بقیه اطلاعات را می‌توانید بعداً کامل کنید.')}<form id="customer-form" data-id="${esc(id||'')}"><label class="field">نام و نام خانوادگی <span class="required">*</span><input name="name" required maxlength="100" value="${esc(c?.name||'')}" placeholder="مثلاً مریم احمدی" autofocus autocomplete="name"></label><label class="field">شماره تلفن <span class="optional">اختیاری</span><input name="phone" type="tel" maxlength="30" value="${esc(c?.phone||'')}" placeholder="۰۹۱۲…" autocomplete="tel" dir="ltr"></label><label class="field">یادداشت <span class="optional">اختیاری</span><textarea name="notes" rows="3" maxlength="1000" placeholder="توضیحی که بعداً به کارتان می‌آید">${esc(c?.notes||'')}</textarea></label>${formFooter(c?'ذخیره تغییرات':'ذخیره مشتری')}</form>`);}
function policyForm(customerId){
  const c=data.customers.find(c=>c.id===customerId),issued=today();
  openDialog(`${modalTitle('بیمه‌نامه جدید',`برای ${esc(c.name)} · همه مبلغ‌ها به ${currency()}`)}<form id="policy-form" data-customer="${esc(customerId)}"><div class="form-grid"><label class="field">نوع بیمه <input name="title" required maxlength="100" list="insurance-types" value="بیمه شخص ثالث" autofocus></label><label class="field">شماره بیمه‌نامه <span class="optional">اختیاری</span><input name="number" maxlength="80" placeholder="شماره روی بیمه‌نامه"></label></div><datalist id="insurance-types">${['بیمه شخص ثالث','بیمه بدنه خودرو','بیمه عمر','بیمه آتش‌سوزی','بیمه درمان'].map(t=>`<option value="${t}">`).join('')}</datalist><label class="field">مبلغ کل بیمه <span class="required">*</span><div class="input-unit"><input name="total" inputmode="numeric" required placeholder="۱۲٬۰۰۰٬۰۰۰" maxlength="18"><span>${currency()}</span></div></label><label class="field">روش پرداخت<select name="plan"><option value="installments">پیش‌پرداخت و اقساط</option><option value="cash">نقدی، تسویه کامل</option></select></label><label class="field">تاریخ شروع بیمه و دریافت اولیه (شمسی)<input class="date-input" name="paymentDate" inputmode="numeric" value="${dateInput(issued)}" dir="ltr" required><small>پرداخت واقعی در همین تاریخ ثبت می‌شود؛ تاریخ آینده پذیرفته نیست.</small></label><div id="installment-fields"><div class="form-grid"><label class="field">درصد پیش‌پرداخت <span class="optional">طبق قرارداد</span><div class="input-unit"><input name="downPercent" inputmode="decimal" placeholder="مثلاً ۳۰" maxlength="6"><span>٪</span></div></label><label class="field">مبلغ پیش‌پرداخت واقعی<div class="input-unit"><input name="down" inputmode="numeric" value="۰" required maxlength="18"><span>${currency()}</span></div></label></div><div class="form-divider">برنامه پرداخت مانده · بدون سود</div><div class="form-grid"><label class="field">تعداد اقساط (۱ تا ۶)<input name="count" inputmode="numeric" value="۵" required maxlength="1"></label><label class="field">فاصله اقساط<select name="frequency"><option value="monthly" selected>قسط اول ۱ ماه و ۱۵ روز بعد؛ سپس ماهانه (پیش‌فرض)</option><option value="month-plus-15">هر قسط ۱ ماه شمسی و ۱۵ روز بعد از قسط قبل</option><option value="weekly">هر هفته (۷ روز)</option></select></label></div><label class="field">سررسید اولین قسط (شمسی)<input class="date-input" name="firstDate" inputmode="numeric" value="${dateInput(firstInsuranceDue(issued))}" dir="ltr" required><small>پیش‌فرض: اولین قسط یک ماه شمسی و ۱۵ روز پس از شروع بیمه است. در دوره پیش‌فرض، قسط‌های بعدی هر ماه شمسی بر اساس تاریخ اولین قسط تعیین می‌شوند. تاریخ‌ها قابل تغییرند.</small></label><div id="policy-preview" class="schedule-preview">مبلغ کل و پیش‌پرداخت را وارد کنید تا برنامه ساخته شود.</div><div id="schedule-editor"></div></div><div id="cash-note" class="form-note" hidden>کل مبلغ در تاریخ شروع بیمه به‌عنوان پرداخت نقدی ثبت می‌شود. سود یا مبلغ اضافه‌ای محاسبه نمی‌شود.</div>${formFooter('ذخیره بیمه‌نامه')}</form>`);
  updatePolicyForm($('#policy-form'));
}
function policyValues(form){
  const v=Object.fromEntries(new FormData(form));
  if(v.plan==='installments'&&form.dataset.manualSchedule==='yes'){
    v.installmentDates=[...form.querySelectorAll('[data-installment-date]')].map(x=>x.value);
    v.installmentAmounts=[...form.querySelectorAll('[data-installment-amount]')].map(x=>x.value);
  }
  return v;
}
function updatePolicyForm(form){
  const v=Object.fromEntries(new FormData(form)),cash=v.plan==='cash';
  form.querySelector('#installment-fields').hidden=cash;form.querySelector('#cash-note').hidden=!cash;
  if(cash)return;
  const preview=form.querySelector('#policy-preview'),editor=form.querySelector('#schedule-editor');
  try{
    const p=makePolicy(policyValues(form)),regular=p.installments.filter(i=>i.kind==='regular');
    preview.innerHTML=`${money(regular.length)} قسط · جمع اقساط ${cashAmount(regular.reduce((sum,i)=>sum+i.amount,0))} · بدون سود`;
    if(form.dataset.manualSchedule!=='yes')editor.innerHTML=`<div class="form-divider">تاریخ و مبلغ هر قسط را در صورت نیاز تغییر دهید</div>${regular.map((i,n)=>`<div class="form-grid installment-edit"><label class="field">سررسید قسط ${fa(n+1)}<input data-installment-date="${n}" name="installmentDate${n}" class="date-input" inputmode="numeric" dir="ltr" value="${dateInput(i.dueDate)}" required></label><label class="field">مبلغ قسط ${fa(n+1)} <small>(${currency()})</small><input data-installment-amount="${n}" name="installmentAmount${n}" inputmode="numeric" value="${money(i.amount)}" required></label></div>`).join('')}`;
  }catch(e){preview.textContent=e.message; if(form.dataset.manualSchedule!=='yes')editor.innerHTML='';}
}
function cashAmount(n){return `${money(n)} ${currency()}`;}
function scheduleForm(customerId,policyId){
  const c=data.customers.find(c=>c.id===customerId),p=c?.policies.find(p=>p.id===policyId);
  if(!p||p.frequency==='cash')throw new Error('برنامه اقساط پیدا نشد.');
  const regular=p.installments.filter(i=>i.kind==='regular');
  openDialog(`${modalTitle('ویرایش برنامه اقساط',`${esc(c.name)} · ${esc(p.title)}`)}<p class="form-note">تاریخ یا مبلغ هر قسط را تغییر دهید. جمع اقساط و پیش‌پرداخت باید همان مبلغ کل بیمه بماند؛ سابقهٔ پرداخت‌ها حفظ می‌شود.</p><form id="schedule-form" data-customer="${esc(customerId)}" data-policy="${esc(policyId)}">${regular.map((i,n)=>`<div class="form-grid installment-edit"><label class="field">تاریخ قسط ${fa(n+1)}<input name="date${n}" class="date-input" inputmode="numeric" dir="ltr" required value="${dateInput(i.dueDate)}"></label><label class="field">مبلغ قسط ${fa(n+1)} <small>(${currency()})</small><input name="amount${n}" inputmode="numeric" required value="${money(i.amount)}"></label></div>`).join('')}<div class="form-error" role="alert" id="form-error"></div><div class="form-actions"><button class="btn primary" type="submit">${icon('check')}ذخیره برنامه</button><button class="btn secondary" type="button" data-action="close">انصراف</button></div></form>`);
}
function paymentForm(customerId,policyId){const c=data.customers.find(c=>c.id===customerId),p=c.policies.find(p=>p.id===policyId),s=policySummary(p);if(!s.owed)return;openDialog(`${modalTitle('ثبت پرداخت',`${esc(c.name)} · ${esc(p.title)}`)}<div class="payment-balance"><span>مانده این بیمه‌نامه</span><strong>${cash(s.owed)}</strong></div><form id="payment-form" data-customer="${esc(customerId)}" data-policy="${esc(policyId)}"><label class="field">مبلغ دریافت‌شده <span class="required">*</span><div class="input-unit"><input name="amount" inputmode="numeric" required value="${money(s.next?.left||s.owed)}" maxlength="18" autofocus><span>${currency()}</span></div></label><label class="field">تاریخ دریافت (شمسی)<input name="date" class="date-input" inputmode="numeric" required value="${dateInput(today())}" dir="ltr"></label><label class="field">یادداشت <span class="optional">اختیاری</span><input name="note" maxlength="500" placeholder="مثلاً واریز به کارت"></label><div class="form-note">${icon('info')}پرداخت از قدیمی‌ترین قسط باز کم می‌شود. پرداخت بخشی از قسط هم امکان‌پذیر است.</div><div id="duplicate-warning"></div>${formFooter('ثبت و ذخیره پرداخت')}</form>`);}
function confirmRemoval(customerId,policyId,paymentId){const c=data.customers.find(c=>c.id===customerId),p=c.policies.find(p=>p.id===policyId),payment=p.payments.find(p=>p.id===paymentId);openDialog(`${modalTitle('لغو ثبت پرداخت','اگر مبلغ یا تاریخ را اشتباه نوشته‌اید، ثبت را لغو و دوباره وارد کنید.')}<div class="alert">پرداخت ${cash(payment.amount)} در تاریخ ${dateLabel(payment.date)} برای ${esc(c.name)} لغو می‌شود و همین مبلغ به مانده بدهی برمی‌گردد. اصل پرداخت در سابقه می‌ماند و قابل برگرداندن است.</div><div class="form-error" role="alert" id="form-error"></div><div class="form-actions">${button('بله، لغو ثبت','confirm-remove','danger-btn','close',`data-customer="${esc(customerId)}" data-policy="${esc(policyId)}" data-id="${esc(paymentId)}"`)}${button('انصراف','close','secondary','')}</div>`);}
function showHelp(){openDialog(`${modalTitle('دفتر، به زبان ساده','برای شروع فقط این سه کار را انجام دهید.')}<ol class="help-steps"><li><b>مشتری را اضافه کنید.</b><p>نام و در صورت نیاز شماره تماس را بنویسید.</p></li><li><b>بیمه‌نامه و اقساط را ثبت کنید.</b><p>مبلغ کل، پیش‌پرداخت واقعی و تعداد اقساط را وارد کنید.</p></li><li><b>هر بار پول گرفتید، «ثبت پرداخت» را بزنید.</b><p>مانده بدهی خودکار کم می‌شود؛ رسیدن سررسید به تنهایی بدهی را کم نمی‌کند.</p></li></ol><div class="help-notes"><p><b>بدون اینترنت:</b> پس از دیدن نشان «آماده استفاده آفلاین»، همین صفحه را حتی پس از بستن مرورگر هم می‌توانید باز کنید. برنامه روی همان مرورگر و دستگاه کار می‌کند.</p><p><b>تاریخ‌ها:</b> همه تاریخ‌ها شمسی‌اند. عدد فارسی، عربی و انگلیسی پذیرفته می‌شود. قسط ماهانه در ماه کوتاه‌تر به آخر ماه می‌رود و در ماه بعد به روز اصلی برمی‌گردد.</p><p><b>پشتیبان:</b> در بخش پشتیبان، فایل دفتر را دریافت کنید. برای اتصال گوشی دیگر، در پشتیبان و تنظیمات، اتصال آنلاین را یک بار راه‌اندازی کنید. وضعیت «آنلاین بررسی شد» زمان آخرین بررسی را نشان می‌دهد؛ پس از ویرایش در دستگاه دیگر، همگام‌سازی را بزنید یا به این صفحه برگردید. بازگرداندن جایگزین فایل در دفتر متصل غیرفعال است.</p><p><b>نصب روی گوشی:</b> در منوی مرورگر «افزودن به صفحه اصلی» را انتخاب کنید. اعلان یا پیامک خودکار ارسال نمی‌شود.</p></div><div class="form-actions">${button('متوجه شدم','close','primary','check')}</div>`);}
function download(content,name){const blob=new Blob([content],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function exportLedger(){download(JSON.stringify({...backupLedger(data),exportedAt:new Date().toISOString(),app:'daftar'},null,2),`daftar-${mode}-${today()}.json`);try{localStorage.setItem('daftar.backup.'+mode,today());localStorage.setItem('daftar.backup-revision.'+mode,data.revision||'legacy');}catch{}render();toast('فایل پشتیبان آماده شد؛ آن را در پوشه دانلودها نگه دارید.');}
async function importFile(file){
  if(!file)return;if(ownConnected()){toast('بازگرداندن جایگزین در دفتر متصل غیرفعال است. پشتیبان و سابقه فعلی نگه داشته می‌شود.',true);return;}if(file.size>10*1024*1024){toast('اندازه فایل باید کمتر از ۱۰ مگابایت باشد.',true);return;}
  try{const candidate=backupLedger(validateLedger(JSON.parse(await file.text())));
    openDialog(`${modalTitle('بررسی فایل پشتیبان','پیش از بازگرداندن، اطلاعات فایل را بررسی کنید.')}<div class="import-summary"><b>${money(candidate.customers.length)} مشتری</b><span>واحد پول: ${CURRENCIES[candidate.currency]}</span><span>مانده کل: ${money(ledgerSummary(candidate).owed)} ${CURRENCIES[candidate.currency]}</span></div><div class="alert">این فایل جای دفتر شخصی فعلی را می‌گیرد. اطلاعات نمونه جدا می‌ماند. اگر دفتر شخصی دارید، ابتدا پشتیبان آن را دریافت کنید.</div>${button('دریافت پشتیبان دفتر فعلی','export-own','secondary','backup')}<label class="confirm-check"><input type="checkbox" id="restore-confirm">می‌دانم که دفتر شخصی فعلی جایگزین می‌شود.</label><div class="form-error" id="form-error" role="alert"></div><div class="form-actions">${button('بازگرداندن دفتر','confirm-import','primary','check')}${button('انصراف','close','secondary','')}</div>`);importCandidate={data:candidate,raw:localStorage.getItem(STORE.own)};
  }catch(e){toast(e.message.startsWith('فایل')?e.message:'فایل خوانده نشد. یک پشتیبان JSON سالم انتخاب کنید.',true);}
}
function formError(e){const box=$('#form-error');if(box){box.textContent=e.message;box.scrollIntoView({block:'nearest'});}else toast(e.message,true);}
document.addEventListener('click',async event=>{
  const b=event.target.closest('[data-action]');if(!b)return;event.preventDefault();const a=b.dataset.action;
  try{
    if(a==='nav')go(b.dataset.view);else if(a==='home')go('home');else if(a==='profile')go('profile',b.dataset.id);else if(a==='close')closeDialog();else if(a==='setup')setup();else if(a==='currency')setup(true);else if(a==='demo'){if(!localStorage.getItem(STORE.demo))localStorage.setItem(STORE.demo,JSON.stringify(demoLedger()));switchMode('demo');}else if(a==='add-customer')customerForm();else if(a==='edit-customer')customerForm(b.dataset.id);else if(a==='add-policy')policyForm(b.dataset.id);else if(a==='pay')paymentForm(b.dataset.customer,b.dataset.id);else if(a==='edit-schedule')scheduleForm(b.dataset.customer,b.dataset.policy);else if(a==='filter'){filter=b.dataset.filter;render();}else if(a==='due-filter'){dueFilter=b.dataset.filter;render();}else if(a==='help')showHelp();else if(a==='export')exportLedger();else if(a==='export-raw')download(localStorage.getItem(STORE[mode])||'','daftar-recovery.json');else if(a==='import')$('#import-file').click();else if(a==='export-own'){const raw=localStorage.getItem(STORE.own);if(raw)download(raw,`daftar-before-restore-${today()}.json`);else toast('هنوز دفتر شخصی ذخیره‌شده‌ای ندارید.');}
    else if(a==='open-dues'){dueFilter=b.dataset.filter;go('dues');}
    else if(a==='remove-payment')confirmRemoval(b.dataset.customer,b.dataset.policy,b.dataset.id);
    else if(a==='confirm-remove'){await mutate(d=>{const c=d.customers.find(c=>c.id===b.dataset.customer),idx=c.policies.findIndex(p=>p.id===b.dataset.policy);c.policies[idx]=voidPayment(c.policies[idx],b.dataset.id);});closeDialog();render();toast('پرداخت لغو شد؛ سابقه آن نگه داشته شد و می‌توانید آن را برگردانید.');}
    else if(a==='restore-payment'){await mutate(d=>{const c=d.customers.find(c=>c.id===b.dataset.customer),idx=c.policies.findIndex(p=>p.id===b.dataset.policy);c.policies[idx]=restorePayment(c.policies[idx],b.dataset.id);});render();toast('پرداخت دوباره فعال شد؛ مبلغ و شناسه آن حفظ شد.');}
    else if(a==='resume-draft')resumeDraft(b.dataset.key);
    else if(a==='discard-draft'){const f=$('#dialog form');discardDraft(f);closeDialog();render();toast('فرم ناتمام پاک شد؛ حساب‌ها تغییری نکرد.');}
    else if(a==='confirm-import'){
      await withLedgerLock(()=>{
      if(ownConnected())throw Error('دفتر متصل را نمی‌توان با پشتیبان جایگزین کرد.');
      if(!$('#restore-confirm').checked)throw new Error('برای ادامه، تأیید جایگزینی دفتر را علامت بزنید.');
      if(!importCandidate)throw Error('فایل پشتیبان را دوباره انتخاب کنید.');
      if(localStorage.getItem(STORE.own)!==importCandidate.raw)throw Error('دفتر در پنجره دیگری تغییر کرده است. فایل را دوباره انتخاب کنید.');
      const next={...backupLedger(importCandidate.data),revision:uid(),updatedAt:new Date().toISOString()},raw=JSON.stringify(next);localStorage.setItem(STORE.own,raw);localStorage.setItem(MODE,'own');data=next;baseRaw=raw;mode='own';storageOK=true;corrupt=false;try{localStorage.removeItem('daftar.drafts.'+mode);}catch{}closeDialog();go('home');toast('پشتیبان بازگردانده شد. دفتر شخصی شما آماده است.');
      });
    }
  }catch(e){formError(e);}
});
document.addEventListener('input',event=>{
  const form=event.target.closest('form');if(form?.dataset.draftKey&&event.target.id!=='duplicate-confirm'){saveDraft(form);if(form.id==='payment-form')updateDuplicateWarning(form);}
  if(event.target.id==='customer-search'){query=event.target.value;$('#customer-results').innerHTML=customerRows(view==='home');}
  if(event.target.closest('#policy-form')){
    const f=$('#policy-form'),name=event.target.name;
    if(name==='paymentDate'&&!f.dataset.manualFirst){try{f.elements.firstDate.value=dateInput(firstInsuranceDue(parseDate(event.target.value)));}catch{}}
    if(name==='firstDate')f.dataset.manualFirst='yes';
    if(name==='downPercent'||name==='total'&&f.elements.downPercent.value){
      try{const value=digits(f.elements.downPercent.value),pct=Number(value.replace('٫','.'));if(!Number.isFinite(pct)||pct<0||pct>100||!/^(?:\d+)(?:[.٫]\d{1,2})?$/.test(value))throw Error();f.elements.down.value=String(Math.round(amount(f.elements.total.value)*pct/100));}catch{f.elements.down.value='۰';}
    }else if(name==='down'){
      try{f.elements.downPercent.value=fa(String(Number((amount(f.elements.down.value)/amount(f.elements.total.value)*100).toFixed(2))));}catch{f.elements.downPercent.value='';}
    }
    if(['total','down','downPercent','count','frequency','firstDate','plan'].includes(name)){
      if(name!=='installmentDate'&&name!=='installmentAmount')f.dataset.manualSchedule='';
    }
    if(event.target.matches('[data-installment-date],[data-installment-amount]'))f.dataset.manualSchedule='yes';
    updatePolicyForm(f);
    saveDraft(f);
  }
});
document.addEventListener('change',e=>{if(e.target.id==='import-file'){importFile(e.target.files[0]);e.target.value='';}});
document.addEventListener('submit',async event=>{
  event.preventDefault();const form=event.target,v=Object.fromEntries(new FormData(form)),submit=form.querySelector('[type="submit"]');
  if(submit)submit.disabled=true;
  try{
    if(form.id==='setup-form'){
      await withLedgerLock(()=>{
      if(!Object.hasOwn(CURRENCIES,v.currency))throw new Error('واحد پول را انتخاب کنید.');
      if(ownConnected())throw Error('دفتر متصل را نمی‌توان دوباره ایجاد کرد.');
      const existing=localStorage.getItem(STORE.own);if(existing&&validateLedger(JSON.parse(existing)).customers.length)throw new Error('دفتر شخصی اطلاعات دارد؛ واحد پول آن تغییر نمی‌کند.');
      const next=emptyLedger(v.currency),raw=JSON.stringify(next);localStorage.setItem(STORE.own,raw);localStorage.setItem(MODE,'own');mode='own';data=next;baseRaw=raw;closeDialog();go('customers');toast('دفتر شما آماده است. اولین مشتری را اضافه کنید.');
      });
    }else if(form.id==='customer-form'){
      const name=v.name.trim();if(!name)throw new Error('نام مشتری را وارد کنید.');
      const id=form.dataset.id||uid();await mutate(d=>{const c=d.customers.find(c=>c.id===id);if(c){c.revisions=[...(c.revisions||[]),{at:new Date().toISOString(),name:c.name,phone:c.phone,notes:c.notes}];c.name=name;c.phone=digits(v.phone.trim());c.notes=v.notes.trim();}else d.customers.push({id,name,phone:digits(v.phone.trim()),notes:v.notes.trim(),policies:[]});});discardDraft(form);closeDialog();go('profile',id);toast('اطلاعات مشتری ذخیره شد.');
    }else if(form.id==='policy-form'){
      const policy=makePolicy(policyValues(form));if(!policy.title.trim())throw new Error('نوع بیمه را وارد کنید.');await mutate(d=>d.customers.find(c=>c.id===form.dataset.customer).policies.push(policy));discardDraft(form);closeDialog();render();toast('بیمه‌نامه و برنامه اقساط ذخیره شد.');
    }else if(form.id==='schedule-form'){
      await mutate(d=>{const c=d.customers.find(c=>c.id===form.dataset.customer),index=c.policies.findIndex(p=>p.id===form.dataset.policy),p=c.policies[index],rows=p.installments.filter(i=>i.kind==='regular').map((_,n)=>({date:v['date'+n],amount:v['amount'+n]}));c.policies[index]=reviseSchedule(p,rows);});closeDialog();render();toast('برنامه اقساط ویرایش شد؛ سابقه قبلی نگه داشته شد.');
    }else if(form.id==='payment-form'){
      v.id=form.dataset.operation;const policy=data.customers.find(c=>c.id===form.dataset.customer).policies.find(p=>p.id===form.dataset.policy);
      if(similarPayments(policy,v).length&&!$('#duplicate-confirm')?.checked){updateDuplicateWarning(form);throw new Error('پرداخت مشابهی ثبت شده است. اگر این دریافت جداگانه است، کادر تأیید را علامت بزنید.');}
      await mutate(d=>{const c=d.customers.find(c=>c.id===form.dataset.customer),idx=c.policies.findIndex(p=>p.id===form.dataset.policy);c.policies[idx]=recordPayment(c.policies[idx],v);});discardDraft(form);closeDialog();render();toast('پرداخت ذخیره شد؛ مانده حساب به‌روز است.');
    }
  }catch(e){formError(e);}finally{if(submit)submit.disabled=false;}
});
window.addEventListener('storage',e=>{if(e.key===STORE[mode]&&e.newValue!==baseRaw){reloadData();toast('دفتر با تغییرات پنجره دیگر به‌روز شد.');}});
window.addEventListener('online',()=>{scheduleSync();updateConnection();checkClock();if(!offlineReady&&!offlineBusy)checkOffline();});window.addEventListener('offline',()=>{clockVerified=false;updateClockLabel();updateConnection();});
function updateClockLabel(){
  const current=today();if(current!==shownDay){if($('#dialog').open)$('#today-label').textContent=dateLabel(current);else render();shownDay=current;}
  const label=$('#today-label');if(label)label.textContent=dateLabel(current);
  const status=$('#clock-status');if(status)status.textContent=clockVerified&&navigator.onLine?'تاریخ آنلاین بررسی شد':'ساعت دستگاه · بررسی آنلاین در دسترس نیست';
}
async function checkClock(){
  if(!navigator.onLine||clockBusy)return;
  clockBusy=true;lastClockCheck=Date.now();
  try{await verifyClock();clockVerified=true;}catch{clockVerified=false;}
  finally{clockBusy=false;updateClockLabel();}
}
function refreshClock(){updateClockLabel();if(navigator.onLine&&Date.now()-lastClockCheck>15*60*1000)checkClock();}
setInterval(refreshClock,30000);
window.addEventListener('pageshow',refreshClock);
window.addEventListener('focus',()=>{refreshClock();scheduleSync();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshClock();scheduleSync();}});
function updateConnection(){if($('#connection'))$('#connection').innerHTML=connectionText();if($('#offline-setting'))$('#offline-setting').textContent=offlineDescription();if($('#offline-tip'))$('#offline-tip').textContent=offlineDescription();}
async function checkOffline(){
  if(offlineBusy)return;
  offlineBusy=true;offlineIssue=false;offlineMessage='در حال دریافت نسخه آفلاین…';updateConnection();
  try{
    await prepareOffline({serviceWorker:navigator.serviceWorker,secure:window.isSecureContext,onProgress:message=>{offlineMessage=message;updateConnection();}});
    offlineReady=true;offlineDetail='';
  }catch(error){
    offlineReady=false;offlineIssue=true;offlineDetail=error.detail||error.message;
    offlineMessage=/[\u0600-\u06ff]/.test(error.message)?error.message:'مرورگر نتوانست نسخه آفلاین را دریافت کند. لینک را مستقیم در مرورگر باز کنید و دوباره تلاش کنید.';
    console.warn('Daftar offline setup:',error.message);
  }finally{offlineBusy=false;updateConnection();}
}
document.addEventListener('click',e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(action==='offline-help')showOfflineHelp();if(action==='retry-offline'){closeDialog();checkOffline();}});

function readDrafts(){try{const d=JSON.parse(localStorage.getItem('daftar.drafts.'+mode)||'{}');return d&&typeof d==='object'&&!Array.isArray(d)?d:{};}catch{return {};}}
function validDraft(d){
  if(!d||d.currency!==data.currency||!['customer-form','policy-form','payment-form'].includes(d.kind)||!d.values||typeof d.values!=='object')return false;
  if(d.customer&&!data.customers.some(c=>c.id===d.customer))return false;
  if(d.policy&&!data.customers.find(c=>c.id===d.customer)?.policies.some(p=>p.id===d.policy))return false;
  if(d.id&&!data.customers.some(c=>c.id===d.id))return false;
  return true;
}
function draftBanner(){const entries=Object.entries(readDrafts()).filter(([,d])=>validDraft(d)).sort((a,b)=>(b[1].updatedAt||'').localeCompare(a[1].updatedAt||''));if(!entries.length)return '';const [key,d]=entries[0],label=d.kind==='customer-form'?'اطلاعات مشتری':d.kind==='policy-form'?'بیمه‌نامه':'پرداخت';return `<div class="draft-banner"><div>${icon('edit')}<span><b>${label} ناتمام دارید.</b> هنوز در حساب‌ها ثبت نشده است.</span></div>${button('ادامه فرم','resume-draft','secondary','arrow',`data-key="${esc(key)}"`)}</div>`;}
function attachDraft(form){
  if(!form||!['customer-form','policy-form','payment-form'].includes(form.id))return;
  form.dataset.draftKey=[form.id,form.dataset.customer||'',form.dataset.policy||'',form.dataset.id||''].join(':');
  form.dataset.operation=uid();
  const draft=readDrafts()[form.dataset.draftKey];
  if(validDraft(draft)){
    for(const [name,value] of Object.entries(draft.values)){const field=form.elements.namedItem(name);if(field&&typeof value==='string'&&value.length<=2000)field.value=value;}
    if(form.id==='policy-form'){updatePolicyForm(form);if(draft.values.installmentDate0){form.dataset.manualSchedule='yes';for(const [name,value] of Object.entries(draft.values)){const field=form.elements.namedItem(name);if(field&&typeof value==='string'&&value.length<=2000)field.value=value;}updatePolicyForm(form);}}
    form.dataset.operation=draft.operation||uid();
    const status=form.querySelector('#draft-status');if(status)status.textContent='اطلاعات ناتمام شما برگشت. هنوز در حساب ثبت نشده است.';
  }
  if(form.id==='payment-form')updateDuplicateWarning(form);
}
function saveDraft(form){
  if(!form?.dataset.draftKey)return;
  try{const drafts=readDrafts();drafts[form.dataset.draftKey]={kind:form.id,currency:data.currency,id:form.dataset.id||'',customer:form.dataset.customer||'',policy:form.dataset.policy||'',operation:form.dataset.operation,values:Object.fromEntries([...new FormData(form)].filter(([name])=>name!=='duplicate-confirm')),updatedAt:new Date().toISOString()};localStorage.setItem('daftar.drafts.'+mode,JSON.stringify(drafts));const status=form.querySelector('#draft-status');if(status)status.textContent='فرم ناتمام روی این دستگاه نگه داشته شد؛ برای ثبت حساب، دکمه ذخیره را بزنید.';}catch{const status=form.querySelector('#draft-status');if(status)status.textContent='فرم ناتمام ذخیره نشد؛ پیش از بستن، اطلاعات را ثبت کنید.';}
}
function discardDraft(form){if(!form?.dataset.draftKey)return;try{const drafts=readDrafts();delete drafts[form.dataset.draftKey];localStorage.setItem('daftar.drafts.'+mode,JSON.stringify(drafts));}catch{}}
function resumeDraft(key){const d=readDrafts()[key];if(!validDraft(d)){toast('این فرم مربوط به دفتر فعلی نیست.',true);return;}if(d.customer)go('profile',d.customer);if(d.kind==='customer-form')customerForm(d.id||null);else if(d.kind==='policy-form')policyForm(d.customer);else paymentForm(d.customer,d.policy);}
function updateDuplicateWarning(form){
  let slot=form.querySelector('#duplicate-warning');if(!slot)return;
  try{const p=data.customers.find(c=>c.id===form.dataset.customer).policies.find(p=>p.id===form.dataset.policy),values=Object.fromEntries(new FormData(form)),duplicates=similarPayments(p,{...values,id:form.dataset.operation});
    if(duplicates.length)slot.innerHTML=`<div class="alert duplicate-alert"><b>پرداخت مشابه پیدا شد.</b><p>در همین بیمه‌نامه، پرداخت ${cash(amount(values.amount))} در ${dateLabel(parseDate(values.date))} ثبت شده است.</p><label class="confirm-check"><input type="checkbox" id="duplicate-confirm">این دریافت جداگانه است؛ آن را هم ثبت کن.</label></div>`;else slot.innerHTML='';
  }catch{slot.innerHTML='';}
}
function cloudMessage(){
  if(!navigator.onLine)return 'روی دستگاه ذخیره شد؛ در انتظار اینترنت';
  if(sync.status==='syncing')return 'روی دستگاه ذخیره شد؛ در حال بررسی آنلاین…';
  if(Object.keys(data.cloud?.conflicts||{}).length)return 'دو نسخه متفاوت پیدا شد؛ بررسی لازم است';
  if(sync.status==='error')return sync.message;
  if(Object.keys(data.cloud?.pending||{}).length)return 'روی دستگاه ذخیره شد؛ در صف ارسال آنلاین';
  if(data.cloud?.confirmedAt)return 'آنلاین بررسی شد: '+fa(new Date(data.cloud.confirmedAt).toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'}));
  return 'روی دستگاه ذخیره شد؛ هنوز آنلاین تأیید نشده';
}
function cloudStrip(){return mode==='own'&&data.cloud&&view!=='backup'?`<div class="save-strip" role="status"><span>${esc(cloudMessage())}</span><button data-action="cloud-settings">بررسی همگام‌سازی</button></div>`:'';}
function cloudPanel(){
  if(mode==='demo')return '';
  const conflicts=Object.entries(data.cloud?.conflicts||{});
  return `<section class="panel settings-card cloud-card"><h2>اتصال آنلاین دفتر</h2>${data.cloud?'<p class="cloud-local">'+icon('check')+'حساب‌ها روی این دستگاه ذخیره شده‌اند.</p>':''}<p class="cloud-status" role="status" aria-live="polite">${data.cloud?esc(cloudMessage()):'راه‌اندازی فقط یک بار روی هر دستگاه انجام می‌شود. دفتر نمونه هرگز ارسال نمی‌شود.'}</p><div class="cloud-actions">${data.cloud?button('همگام‌سازی اکنون','cloud-sync','secondary','clock',sync.status==='syncing'?'disabled':''):button(sync.remote.session()?'بررسی اتصال دفتر':'ورود اولیه دستگاه','cloud-connect','secondary','shield')}${sync.status==='error'?button('تمدید ورود دستگاه','cloud-login','secondary','shield'):''}</div><details class="cloud-help"><summary>همگام‌سازی چگونه انجام می‌شود؟</summary><p>زمان بالا، آخرین بررسی موفق است. برای دریافت تغییرات دستگاه دیگر، همگام‌سازی را بزنید یا به برنامه برگردید. بررسی هنگام بازگشت به صفحه، اتصال دوباره اینترنت و ذخیره تغییر نیز انجام می‌شود. فایل پشتیبان را جداگانه نگه دارید.</p></details>${conflicts.map(([id,c])=>`<div class="alert"><p>اختلاف در پرونده ${esc(c.local?.name||c.remote?.name||'مشتری')}؛ هیچ‌کدام از دو نسخه حذف نشده است.</p>${button('مقایسه دو نسخه','cloud-conflict','secondary','file',`data-id="${esc(id)}"`)}</div>`).join('')}</section>`;
}
function cloudLogin(){openDialog(`${modalTitle('ورود اولیه دستگاه','ایمیل و رمز حساب اختصاصی دفتر را وارد کنید. پس از ورود، دستگاه دسترسی را نگه می‌دارد؛ رمز ذخیره نمی‌شود.')}<form id="cloud-login-form"><label>ایمیل<input name="email" type="email" autocomplete="username" dir="ltr" required></label><label>رمز عبور<input name="password" type="password" autocomplete="current-password" dir="ltr" required></label><p>ورود به معنی تأیید نگه داشتن دسترسی همین دستگاه است. از دستگاه شخصی استفاده کنید.</p><div class="form-error" id="form-error" role="alert"></div><div id="firebase-connection-test" hidden><button class="btn secondary" data-action="cloud-diagnose" type="button">بررسی اتصال Firebase بدون رمز</button><p id="firebase-test-result" role="status" aria-live="polite"></p></div><div class="form-actions"><button type="submit" class="btn primary">ورود و نگه داشتن دسترسی دستگاه</button></div></form>`);}
async function cloudPreview(){
  if(!sync.remote.session()){cloudLogin();return;}
  const preview=await sync.preview();
  openDialog(`${modalTitle('پیش از اتصال دفتر','دو نسخه بررسی و ترکیب می‌شوند؛ نسخه آنلاین روی دفتر غیرخالی نوشته نمی‌شود.')}<p>این دستگاه: ${money(preview.local.customers.length)} مشتری · ${CURRENCIES[preview.local.currency]}</p><p>آنلاین: ${money(preview.documents.length)} مشتری · ${preview.meta?CURRENCIES[preview.meta.currency]:'دفتر هنوز ایجاد نشده'}</p><p>ابتدا پشتیبان این دستگاه را دریافت کنید. مشتریان با شناسه متفاوت هر دو نگه داشته می‌شوند؛ نام یکسان با شناسه متفاوت ممکن است دو پرونده جدا باشد. اختلاف در یک پرونده نیاز به بررسی شما دارد.</p>${button('دریافت پشتیبان پیش از اتصال','cloud-backup','secondary','backup')}<label class="confirm-check"><input type="checkbox" id="cloud-join-confirm">پشتیبان را نگه داشتم؛ اتصال و ارسال این دفتر به پروژه Firebase خودم را تأیید می‌کنم.</label><div class="form-error" id="form-error" role="alert"></div><div class="form-actions">${button('اتصال و همگام‌سازی','cloud-join','primary','check')}</div>`);
  cloudJoinPreview=preview;
}
let cloudJoinPreview=null;
function conflictCustomer(c){
  if(!c)return '<p>این پرونده در این نسخه وجود ندارد.</p>';
  const summary=customerSummary(c);
  return `<h3>${esc(c.name)}</h3><p>${esc(fa(c.phone))} ${esc(c.notes)}</p><p>پرداخت‌شده: ${cash(summary.paid)} · مانده: ${cash(summary.owed)}</p>${c.policies.map(p=>`<div class="alert"><h4>${esc(p.title)} · ${esc(fa(p.number))}</h4><p>مبلغ قرارداد: ${cash(p.total)}</p><h4>پرداخت‌ها</h4>${p.payments.length?p.payments.map(r=>`<p>${cash(r.amount)} · ${dateLabel(r.date)} · ${r.voidedAt?'لغوشده':'فعال'} ${esc(r.note)}</p>`).join(''):'<p>پرداختی ثبت نشده است.</p>'}<h4>برنامه اقساط</h4>${p.installments.map(i=>`<p>${dateLabel(i.dueDate)} · ${cash(i.amount)}</p>`).join('')}</div>`).join('')}`;
}
function showCloudConflict(id){const c=data.cloud?.conflicts[id];if(!c)return;
  openDialog(`${modalTitle('مقایسه دو نسخه','انتخاب شما کل همین پرونده را تعیین می‌کند. سایر مشتریان تغییر نمی‌کنند. هر دو نسخه در سابقه تصمیم نگه داشته می‌شوند.')}<p>پیش از انتخاب، مبالغ و پرداخت‌های هر دو نسخه را بررسی کنید. پرداخت موجود فقط در نسخه انتخاب‌نشده به حساب فعال اضافه نمی‌شود.</p><div class="backup-grid">${['local','remote'].map(side=>`<section><h3>${side==='local'?'این دستگاه':'نسخه آنلاین'}</h3>${conflictCustomer(c[side])}${c[side]?button('انتخاب همین نسخه','cloud-resolve','secondary','check',`data-id="${esc(id)}" data-choice="${side}"`):''}</section>`).join('')}</div>${button('دریافت هر دو نسخه','cloud-conflict-backup','secondary','backup',`data-id="${esc(id)}"`)}<label class="confirm-check"><input type="checkbox" id="cloud-resolution-confirm">هر دو نسخه را بررسی کردم و انتخاب کل پرونده را تأیید می‌کنم.</label><div class="form-error" id="form-error" role="alert"></div>`);
}
document.addEventListener('click',async event=>{
  const b=event.target.closest('[data-action]');if(!b)return;const action=b.dataset.action;
  if(!action.startsWith('cloud-'))return;
  event.preventDefault();b.disabled=true;
  try{
    if(action==='cloud-settings'){closeDialog();go('backup');}
    if(action==='cloud-sync')await sync.run();
    if(action==='cloud-login')cloudLogin();
    if(action==='cloud-diagnose'){
      const result=$('#firebase-test-result');
      if(result){
        result.textContent='آزمایش بدون اطلاعات حساب آغاز شد…';
        const findings=await inspectFirebaseConnection({onProgress:message=>{result.textContent=message;}});
        result.textContent=findings.summary+' کد آزمایش: '+findings.code;
      }
    }
    if(action==='cloud-connect')await cloudPreview();
    if(action==='cloud-backup')download(JSON.stringify(backupLedger(data),null,2),`daftar-before-sync-${today()}.json`);
    if(action==='cloud-join'){
      if(!$('#cloud-join-confirm')?.checked)throw Error('تأیید اتصال و دریافت پشتیبان لازم است.');
      if(!cloudJoinPreview)throw Error('پیش‌نمایش را دوباره باز کنید.');
      await sync.connect(cloudJoinPreview);closeDialog();render();
    }
    if(action==='cloud-conflict')showCloudConflict(b.dataset.id);
    if(action==='cloud-conflict-backup')download(JSON.stringify(data.cloud.conflicts[b.dataset.id],null,2),`daftar-conflict-${today()}.json`);
    if(action==='cloud-resolve'){
      if(!$('#cloud-resolution-confirm')?.checked)throw Error('بررسی و انتخاب کل پرونده را تأیید کنید.');
      await sync.resolve(b.dataset.id,b.dataset.choice);closeDialog();render();
    }
  }catch(e){formError(e);}finally{b.disabled=false;}
});
document.addEventListener('submit',async event=>{
  const form=event.target;if(form.id!=='cloud-login-form')return;
  event.preventDefault();const submitButton=form.querySelector('button');submitButton.disabled=true;
  const email=form.elements.email.value, password=form.elements.password.value;
  try {await sync.signIn(email.trim(),password);}
  catch(error){
    formError(Error(explainLoginFailure(error)));
    if(['NETWORK_UNAVAILABLE','REQUEST_TIMEOUT','BAD_RESPONSE'].includes(error?.code)){
      const check=form.querySelector('#firebase-connection-test');
      if(check)check.hidden=false;
    }
    return;
  }
  finally {form.elements.password.value='';submitButton.disabled=false;}
  // A successful sign-in is not a failed password when a subsequent Firestore
  // read or first-device join has a separate problem.
  closeDialog();
  try {if(readOwn()?.cloud)await sync.run();else await cloudPreview();}
  catch(error){toast('ورود با موفقیت انجام شد، ولی دریافت دفتر آنلاین کامل نشد. اینترنت و تنظیمات Firebase را بررسی کنید؛ اطلاعات محلی تغییر نکرده است.',true);}
});

function saveStrip(){
  if(!storageOK||corrupt||mode==='demo')return '';
  let backed=false;try{backed=localStorage.getItem('daftar.backup-revision.'+mode)===(data.revision||'legacy');}catch{}
  return `<div class="save-strip">${view==='backup'&&data.cloud?'':`<span>${icon('check')}حساب‌ها روی این دستگاه ذخیره شده‌اند.</span>`}<button data-action="${view==='backup'?'export':'nav'}"${view==='backup'?'':' data-view="backup"'}>${icon('backup')}${backed?'فایل آخرین تغییرات آماده شده':'از آخرین تغییرات پشتیبان بگیرید'}</button></div>`;
}
$('#dialog').addEventListener('cancel',()=>saveDraft($('#dialog form')));
$('#dialog').addEventListener('close',()=>{if(!corrupt)render();});
window.addEventListener('pagehide',()=>{if($('#dialog').open)saveDraft($('#dialog form'));});
render();checkClock();checkOffline();scheduleSync();

