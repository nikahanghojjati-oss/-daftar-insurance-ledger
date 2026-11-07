# دفتر — Persian insurance customer ledger

[راهنمای فارسی](README.fa.md) · [Next GPT handoff](docs/HANDOFF.md) · [Agent instructions](AGENTS.md)

This is the standalone GitHub Pages source. The application is fully static; `dist/` is the publication directory. GitHub Actions runs the tests before publishing. In repository Settings → Pages, set the source to GitHub Actions. Repository: https://github.com/nikahanghojjati-oss/-daftar-insurance-ledger

GitHub Pages is live: https://nikahanghojjati-oss.github.io/-daftar-insurance-ledger/.

Current data status: local-first ledger with optional private Firebase REST synchronization. Owner-approved UID-scoped rules were published. A phone screenshot shows one recorded successful online check; persistent access and two-physical-device production acceptance remain unverified. See [the current work plan](docs/WORK_PLAN.md) and the latest validation notes.


Publicly accessible, buildless application with a device-local ledger and optional private cloud connection. No AI, analytics, CDN, or external font dependencies.

## Workflows

- Clearly separate fictional demo and initially empty personal ledger.
- Explicit toman or rial choice when the personal ledger starts; never convert automatically.
- Customer creation, editing, normalized Persian/Arabic/Latin name/phone/policy-number search.
- Multiple insurance policies per customer, actual down payments, Shamsi-monthly or seven-day installment schedules, exact integer allocation.
- Partial/advance/full payments, overpayment/future-date rejection, payment correction confirmation, live debt and due-date totals.
- Potential duplicate payments show a Farsi warning and require an explicit separate-receipt acknowledgment. Stable operation IDs prevent a retry from saving the same receipt twice.
- Cancellation retains the original payment ID, amount and date with an audit trail. Undo restores the same receipt if doing so will not create an overpayment.
- Unfinished customer/policy/payment forms stay on the device and can be resumed after closing/reloading. Drafts are clearly unconfirmed, excluded from balances and backups, and separated by demo/personal ledger and form context.
- A visible status distinguishes device-local saving from generation of a backup of the latest revision. Phone installment details use stacked cards.
- Local browser persistence, backup export, strict validated restore with preview and replacement acknowledgment.
- Service worker caches all application dependencies. The readiness indicator appears only after shell caching completes. Offline navigation and application assets use cached responses when network requests fail. Online hosting-auth failures are returned, never replaced by cached pages.
- All visible dates are Persian calendar; date storage uses ISO civil dates. Today uses Tehran's calendar day. Month-end schedules retain their original day anchor.

## Development

`npm test` runs independent calendar, arithmetic, data-validation and service-worker behavior tests. `node --check dist/app.js` checks application syntax. No install or build step needed. Static assets are in `dist/`.

## Deliberate prototype limits

Unconnected records remain specific to this browser and device. Connected ledgers reconcile at startup, return/focus, reconnect, local save and manual sync; they do not continuously stream updates. No notifications, SMS or accounting integration. Local records and exported JSON are not encrypted. Protect device access and backup files. Clearing browser data removes the local ledger. The owner explicitly authorized public access on 2026-11-01 so the app opens without ChatGPT login. Public access exposes the application and fictional demo only; customer records remain device-local unless the owner explicitly connects the private Firebase ledger. Profile discovery is a separate ChatGPT setting.

Ledger schema 2 reads original schema-1 ledgers and backups without changing amounts. New schema-2 backups retain cancellation history. Unfinished forms are local-only and are not included in confirmed-ledger backups.

Offline app use requires an initial HTTPS visit and a completed “آماده استفاده آفلاین” indicator. Browser/OS storage eviction and a device-specific Safari/PWA check remain relevant outside this prototype's controlled validation.

## Font and offline repair — 2026-11-01

Hesabfa login computed body/input font: Iransans-web, Tahoma, sans-serif. Mahak marketing CSS uses Peyda. These observations establish the specific web pages, not every installed edition. The app bundles Vazirmatn v33.003 (111,152 bytes), SIL OFL 1.1 license included. Existing font sizes are preserved. No CDN is needed.

Offline setup now detects a failed worker installation, bounds stalled readiness, verifies the full current-version cache (including the font), and offers an actionable Farsi error plus retry. Cached assets load directly; navigation falls back after a bounded network attempt. Changes do not alter the customer ledger schema or storage keys.

## Insurance payment defaults (new)
Pay in full on the policy start date, or record a real down payment and one to six interest-free installments. The first due date defaults to one Jalali month plus 15 days after the start (Esfand 5 → Farvardin 20); the rest default to anchored Jalali months. The down-payment percent, amount, first due date, installment dates and installment amounts are editable. A saved schedule can be revised without changing the original contract total or receipts; old schedule values are retained in the audit history.

The displayed current date uses Tehran time from the current clock and refreshes after midnight, on focus and on page return. Online, a fresh same-origin server Date header is checked; offline, the device clock is required and the UI says so. No offline app can guarantee an authoritative date if that clock is wrong.

## Historical Firebase setup notes (superseded by later entries)

The owner can connect a dedicated rules-only service account through the encrypted GitHub Actions secret `FIREBASE_RULES_SERVICE_ACCOUNT_JSON`. Follow the [Chromebook owner setup guide](docs/FIREBASE_OWNER_SETUP.fa.md). A manual workflow verifies read-only Rules API access; publishing is blocked by a deny-all placeholder until reviewed UID-scoped rules and the sync client are ready. This key never enters GitHub Pages or the chat. No Firebase verification or customer sync has occurred yet.


### Sync preparation (2026-11-02 ET)

The continuation branch includes an optional local-first Firebase REST sync implementation and candidate UID-scoped rules. The console setup and rules-only GitHub access are verified. At that preparation stage, cloud customer access was still disabled by deny-all rules; the later activation entry below supersedes it. See the latest HANDOFF and VALIDATION sections for implemented behavior, evidence and remaining acceptance gates. Never migrate real customer records before those gates pass.

Owner-approved private Firebase rules were published on 2026-11-02 ET. The sync client still requires initial device sign-in and connection review; production two-device acceptance must precede migration of real records.

New insurance policies default to the first installment due one Jalali month plus 15 calendar days after issuance, followed by installments each Jalali month anchored to that first due date. The form labels this as the default; the older every-month-plus-15-days recurrence and weekly schedules remain optional. Existing saved schedules retain their dates and frequency; custom dates and amounts remain editable.
