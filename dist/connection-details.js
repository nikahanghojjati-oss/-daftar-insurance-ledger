// Display only release identifiers, never account/session/ledger contents.
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function connectionDetails({pageVersion,loginVersion,expectedCache,preparedCache,controller}) {
  const active=controller?.status==='verified'?controller.version:
    controller?.status==='uncontrolled'?'این صفحه هنوز کنترل‌کنندهٔ آفلاین ندارد':
    controller?.status==='changed'?'کنترل‌کننده هنگام بررسی تغییر کرد؛ دوباره بررسی کنید':
    controller?.status==='pending'?'در حال بررسی…':'نسخه تأیید نشد';
  const rows=[['نسخهٔ کد صفحه',pageVersion],['نسخهٔ کد ورود',loginVersion],
    ['کش مورد انتظار صفحه',expectedCache],['کش آماده‌شده',preparedCache||'هنوز تأیید نشده'],
    ['کش کنترل‌کنندهٔ همین صفحه',active]];
  return `<p>نسخهٔ صفحه و کد ورود، نسخه‌های در حال اجرای این صفحه‌اند. آماده شدن کش جدید، به‌تنهایی تازه بودن کد صفحه را ثابت نمی‌کند.</p><dl>${rows.map(([label,value])=>`<div><dt>${label}</dt><dd dir="auto" style="overflow-wrap:anywhere">${escape(value)}</dd></div>`).join('')}</dl><p>این بررسی فقط مشخصات نسخه را می‌خواند؛ ورود یا همگام‌سازی موفق را تأیید نمی‌کند.</p>`;
}
