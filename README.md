# دفتر — Persian insurance customer ledger

[راهنمای فارسی](README.fa.md) · [Next GPT handoff](docs/HANDOFF.md) · [Agent instructions](AGENTS.md)

This is the standalone GitHub Pages source. The application is fully static; `dist/` is the publication directory. GitHub Actions runs the tests before publishing. In repository Settings → Pages, set the source to GitHub Actions. Repository: https://github.com/nikahanghojjati-oss/-daftar-insurance-ledger

GitHub Pages publication requires Settings → Pages → Source: GitHub Actions. The workflow will publish after that setting is enabled. Do not treat a guessed github.io URL as a verified deployment.

**Current data status: browser-local; automatic cloud sync is not yet implemented.** A Firebase project was created separately; see the handoff for verified and unverified setup details.


Publicly accessible, buildless, browser-local prototype for a beginner. No API, AI, remote customer storage, analytics, CDN, or external font dependencies.

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

Records are specific to this browser and device. No automatic multi-device sync, notifications, SMS, accounting integration, or business/customer-data server. Local records and exported JSON are not encrypted. Protect device access and backup files. Clearing browser data removes the local ledger. The owner explicitly authorized public access on 2026-11-01 so the app opens without ChatGPT login. Public access exposes the application and fictional demo only; customer records remain in each browser. Profile discovery is a separate ChatGPT setting.

Ledger schema 2 reads original schema-1 ledgers and backups without changing amounts. New schema-2 backups retain cancellation history. Unfinished forms are local-only and are not included in confirmed-ledger backups.

Offline app use requires an initial HTTPS visit and a completed “آماده استفاده آفلاین” indicator. Browser/OS storage eviction and a device-specific Safari/PWA check remain relevant outside this prototype's controlled validation.

## Font and offline repair — 2026-11-01

Hesabfa login computed body/input font: Iransans-web, Tahoma, sans-serif. Mahak marketing CSS uses Peyda. These observations establish the specific web pages, not every installed edition. The app bundles Vazirmatn v33.003 (111,152 bytes), SIL OFL 1.1 license included. Existing font sizes are preserved. No CDN is needed.

Offline setup now detects a failed worker installation, bounds stalled readiness, verifies the full current-version cache (including the font), and offers an actionable Farsi error plus retry. Cached assets load directly; navigation falls back after a bounded network attempt. Changes do not alter the customer ledger schema or storage keys.
