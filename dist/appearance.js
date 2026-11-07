// Presentation preference only; never part of a ledger, backup or sync queue.
export const APPEARANCE_KEY='daftar.appearance.v1';
export const APPEARANCES=[
 {id:'daybook',number:'۱',name:'دفتر روز',description:'کارت برجسته امروز، فردای روشن و فهرست جمع‌وجور مشتریان',color:'#163f52'},
 {id:'agenda',number:'۲',name:'روزنگار',description:'تاریخ بزرگ، ردیف‌های سررسید و خلاصه حساب کنار هم',color:'#405f78'},
 {id:'desk',number:'۳',name:'پیشخوان کار',description:'خلاصه امروز و فردا، همراه پرونده‌های سررسید امروز',color:'#263744'}
];
export const appearanceId=value=>APPEARANCES.some(item=>item.id===value)?value:'daybook';
export function readAppearance(storage){try{return appearanceId(storage.getItem(APPEARANCE_KEY));}catch{return 'daybook';}}
export function applyAppearance(value,root=document.documentElement){const id=appearanceId(value);root.dataset.appearance=id;root.ownerDocument.querySelector('meta[name="theme-color"]')?.setAttribute('content',APPEARANCES.find(a=>a.id===id).color);return id;}
export function saveAppearance(value,storage){const id=appearanceId(value);storage.setItem(APPEARANCE_KEY,id);return id;}
