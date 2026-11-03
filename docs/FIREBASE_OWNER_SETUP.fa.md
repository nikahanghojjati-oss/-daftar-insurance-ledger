# اتصال امن Firebase به دفتر از Chromebook

این راهنما برای پروژهٔ **موجود** `daftar-insurance-ledger` و مخزن **موجود**
`nikahanghojjati-oss/-daftar-insurance-ledger` است. پروژهٔ دوم نسازید و از کلید بازی
Career Mode Showdown استفاده نکنید. انتشار سایت همچنان با GitHub Pages است.

## دو نوع کلید را قاطی نکنید

- **Service Account JSON**: فایل خصوصی حاوی `private_key`. فقط برای GitHub Actions و
  فقط برای بررسی/انتشار قانون Firestore. هرگز در چت، مخزن، سایت، Issues، Pull Request یا
  خروجی برنامه نگذارید. پدرتان هرگز این کلید را نمی‌بیند.
- **Web app `firebaseConfig`**: شامل `apiKey`, `authDomain`, `projectId`, `appId`.
  برای اتصال برنامهٔ مرورگر به پروژه است؛ این کلید به‌تنهایی مجوز خواندن حساب مشتریان
  نیست. بعداً می‌توانید این تنظیمات عمومی را برای تکمیل اپ به من بدهید؛ *رمز عبور و
  Service Account JSON را نفرستید*.
- **GitHub Secret**: محل نگهداری امن JSON برای اجرای workflow. پس از ثبت، مقدار آن
  دوباره در GitHub قابل مشاهده نیست. GPT آینده workflow را اجرا و نتیجه را بررسی
  می‌کند، اما مقدار کلید را نمی‌خواند.

## کارهای یک‌بارهٔ شما، با همان مرورگر Chromebook

### ۱. پروژه و طرح رایگان را بررسی کنید

1. [کنسول Firebase](https://console.firebase.google.com/project/daftar-insurance-ledger/overview)
   را باز کنید. شناسه باید دقیقاً `daftar-insurance-ledger` باشد؛ پروژهٔ بازی را انتخاب نکنید.
2. در بالای کنسول یا **Project settings → Usage and billing** مطمئن شوید طرح **Spark**
   و Billing خاموش/بدون حساب متصل است. اگر کنسول برای یک قابلیت از شما **Upgrade to Blaze**
   یا کارت بانکی خواست، آن قابلیت را فعال نکنید و همان صفحه را گزارش کنید.
3. اگر Firestore از قبل ساخته شده، نام دیتابیس، حالت Standard/Native و منطقهٔ آن را یادداشت کنید.
   **به خاطر این راهنما دیتابیس موجود را حذف یا دوباره نسازید.** اگر هنوز ساخته نشده:
   **Databases & Storage → Firestore → Create database** را بزنید، اولین دیتابیس
   `(default)` با نسخهٔ Standard را ایجاد کنید، منطقه را با توجه به محل استفاده انتخاب کنید،
   و **Production mode** (شروع با دسترسی بسته) را انتخاب کنید. مکان پس از ساخت قابل
   تغییر نیست. Test mode دسترسی گستردهٔ موقت می‌دهد و برای دادهٔ مالی مناسب نیست.
   فقط یک دیتابیس در هر پروژه سهمیهٔ رایگان دارد.

### ۲. حساب خدماتی بسیار محدود بسازید

1. [Service Accounts در Google Cloud](https://console.cloud.google.com/iam-admin/serviceaccounts?project=daftar-insurance-ledger)
   را با **همان حساب Google صاحب پروژه** باز کنید. در بالای صفحه پروژهٔ
   `daftar-insurance-ledger` را انتخاب کنید.
2. **Create service account** را بزنید. در **Service account name** نام نمایشی
   `Daftar Firestore Rules Deployer` را بگذارید. در کادر جداگانهٔ **Service account ID**
   مقدار کوتاه `daftar-rules-deployer` را وارد کنید؛ شناسه باید حداکثر ۳۰ نویسه باشد
   و از نام بلندِ حذف‌شدهٔ قبلی استفاده نکنید. توضیح:
   `Deploy only Daftar Firestore rules from GitHub Actions`. سپس **Create and continue**
   را بزنید تا مرحلهٔ نقش‌ها باز شود.
3. در مرحلهٔ **Grant this service account access to project** فقط نقش
   **Firebase Rules Admin** (`roles/firebaserules.admin`) را بدهید و Done را بزنید.
   نقش Owner، Editor، Firebase Admin، Firestore Data Admin یا Billing Admin لازم نیست.
4. روی حساب ساخته‌شده کلیک کنید → **Keys → Add key → Create new key → JSON → Create**.
   فایل JSON فقط یک بار دانلود می‌شود. آن را باز کنید و آمادهٔ کپی‌کردن *کل محتوای JSON*
   به GitHub Secret باشید؛ نام فایل اهمیتی ندارد. اگر ایجاد کلید به‌دلیل سیاست حساب
   مسدود شد، خطای همان صفحه را بگویید؛ طرح پولی یا نقش گسترده‌تر فعال نکنید.

### ۳. JSON را فقط در Secret همین مخزن بگذارید

1. [Secrets and variables → Actions در مخزن دفتر](https://github.com/nikahanghojjati-oss/-daftar-insurance-ledger/settings/secrets/actions)
   را باز کنید؛ آدرس باید حاوی `-daftar-insurance-ledger` باشد، نه مخزن بازی.
2. **New repository secret** را بزنید.
3. در **Name** دقیقاً بنویسید: `FIREBASE_RULES_SERVICE_ACCOUNT_JSON`.
4. در **Secret** تمام متن فایل JSON دانلودشده (از `{` اول تا `}` آخر) را بگذارید و
   **Add secret** را بزنید. فایل را در مخزن آپلود نکنید، برای من نفرستید، و در پیام
   GitHub قرار ندهید. فایل را تا موفقیت مرحلهٔ verify در جای امن نگه دارید؛ سپس نسخهٔ دانلودشده را از Chromebook
   پاک کنید. اگر برای بازی Secret مشابه دارید، همان را کپی نکنید؛ آن به پروژهٔ دیگری
   تعلق دارد.

### ۴. فقط اتصال را آزمایش کنید

1. [Actions → Verify or publish Daftar Firestore Rules](https://github.com/nikahanghojjati-oss/-daftar-insurance-ledger/actions/workflows/firebase-rules-control.yml)
   را باز کنید؛ **Run workflow** را بزنید، شاخهٔ `main` و گزینهٔ `verify` را انتخاب کنید.
2. پس از پایان، خروجی job باید `FIREBASE_RULES_ACCESS_OK project=daftar-insurance-ledger`
   را نشان دهد. این فقط توانایی خواندن وضعیت Rules را ثابت می‌کند؛ نه قانون زنده را
   تغییر می‌دهد، نه دادهٔ مشتری را می‌خواند، نه همگام‌سازی را روشن می‌کند.
3. لینک اجرای Actions و نتیجهٔ Success/Failure را برای من بفرستید. **خود Secret یا
   فایل JSON را نفرستید.** اگر شکست خورد، فقط متن خطا/شمارهٔ مرحله را بفرستید.

گزینهٔ `publish` در workflow فعلاً با قفل `SETUP_BLOCKED` عمداً خطا می‌دهد. پس از
تکمیل قوانین محدود به شناسهٔ کاربر، آزمون شبیه‌ساز و بررسی شاخهٔ اصلی، کد آن قفل را
برمی‌دارد؛ آن‌وقت workflow قانون را منتشر می‌کند و نسخهٔ زنده را دوباره می‌خواند.
در این مرحله `publish` را اجرا نکنید.

## برای ساخت همگام‌سازی واقعی بعد از اتصال

1. در پروژهٔ Firebase، **Project overview → Add app → Web (`</>`)**؛ نام پیشنهادی
   `Daftar GitHub Pages`. گزینهٔ Firebase Hosting را لازم نیست فعال کنید، چون سایت
   روی GitHub Pages است. `firebaseConfig` را یادداشت کنید. این پیکربندی عمومی را
   می‌توانید در چت بفرستید؛ حاوی private key نیست.
2. **Security → Authentication → Sign-in method → Email/Password → Enable → Save**.
   یک حساب جداگانهٔ دفتر برای استفادهٔ روی دستگاه‌های پدر در نظر می‌گیریم؛ راه ورود
   باید در محصول پنهان و ساده باشد. شناسهٔ UID این حساب را بعد از ایجاد، برای قفل‌کردن
   Rules می‌گیریم؛ **رمز عبور را در چت یا GitHub نمی‌گذاریم**. پیش از ساخت حساب و
   لینک دسترسی، طرح بازیابی و آزمون واقعی روی دو دستگاه را نهایی می‌کنیم.
3. بعد از پیاده‌سازی کلاینت، با دادهٔ ساختگی: یک دستگاه آفلاین، ثبت پرداخت، وصل‌شدن،
   مشاهده روی دستگاه دوم، و ثبت هم‌زمان را امتحان می‌کنیم. تا تأیید سرور، وضعیت
   «روی همین دستگاه ذخیره شد؛ منتظر همگام‌سازی» باقی می‌ماند. قبل از انتقال دفتر واقعی
   از آن فایل JSON پشتیبان بگیرید.

این Service Account فقط Rules را مدیریت می‌کند؛ با آن نمی‌توان پروژه، دیتابیس،
Authentication یا رکوردهای مشتری را ساخت/ویرایش کرد. این محدودیت عمدی است. برای
ادارهٔ دیگر بخش‌ها در آینده، هر دسترسی لازم باید جداگانه و دقیق طراحی شود، نه با
یک کلید Owner مشترک.

## اگر کلید لو رفت

در Google Cloud → همان Service Account → **Keys** کلید را Disable/Delete کنید؛
در GitHub → Secret را حذف/جایگزین کنید؛ JSON تازه‌ای با همان نقش محدود بسازید و
مرحلهٔ verify را دوباره اجرا کنید. نشانهٔ عملیِ پایان کار، Success workflow و
تطابق پروژه است، نه صرفاً ساخت Secret.
