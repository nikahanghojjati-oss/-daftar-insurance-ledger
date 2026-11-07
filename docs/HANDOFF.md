# Daftar: handoff for the next GPT

## Current summary — November 7, 2026

The owner canceled all work splitting. Sol owns the whole project without helper agents; use [WORK_PLAN.md](WORK_PLAN.md). Draft PR #16 is closed and superseded by reliability PR #17.

Firebase REST sync is implemented and UID-scoped rules were historically owner-approved and published. The owner screenshot shows one recorded successful online check. Persistent access and payment exchange between the actual physical devices remain NOT CHECKED. Do not reuse older browser-local-only paragraphs below as the current summary.

Backup revision now tracks portable business records and retained history, ignoring transport-only updates. The backup screen has one online status and expandable help. Cache v18 includes these changes; open PR #15 still targets v17 and needs rebasing before future integration. No schema, monetary/date calculations, production records or Firebase rules were changed.

73 Node checks, four Firestore emulator groups and the two-context Chromium acceptance scenario passed on the application candidate `a150293c457beb74292e149cfb48773ccf117368`. See the latest VALIDATION.md entry for evidence and limitations.

## Start here
Read AGENTS.md, README.md and VALIDATION.md. This repository is the standalone source for the Persian insurance ledger built for the owner's father. Work only in this project, not the owner's football game repository.

## Source provenance
Recovered from the owner's existing Sites source, commit `05f411c6d4db805d7c1654a13cdb93215f9c2984` (published Sites version 6).
Existing public prototype: https://daftar-insurance-nik-2026.nika-harvard.chatgpt.site
Dedicated repository: https://github.com/nikahanghojjati-oss/-daftar-insurance-ledger
The exact repository name begins with a hyphen: `-daftar-insurance-ledger`. GitHub Pages is live at https://nikahanghojjati-oss.github.io/-daftar-insurance-ledger/ (deployment and HTTP 200 verified on 2026-11-02 ET).

## Implemented
- Farsi RTL, Shamsi dates, mixed numeral input, bundled Vazirmatn OFL font.
- Customer and policy search/profiles; weekly or anchored Jalali-monthly installments.
- Exact integer sums, actual down payments, partial/advance/full receipts, consistent totals.
- Duplicate-payment confirmation, stable payment-operation IDs, reversible cancellation with history.
- Draft recovery, separate demo/personal ledgers, JSON backup/restore preview.
- Offline app shell, font and styles; complete-cache readiness handshake; bounded errors and retry.
- Schema 2 with schema-1 migration. See tests for arithmetic/calendar/data validation.

## Data architecture — current limitation
`localStorage` holds the ledger per origin and browser profile. Cache Storage holds application assets, not a shared database. Incognito is separate and temporary. Reconnecting to the internet does not upload ledger records. No cloud client, database rules or cloud sync exists in this snapshot.

Moving from the chatgpt.site origin to github.io does NOT transfer localStorage automatically. Export from the old app before migration and import into the new origin. Restore replaces the personal ledger, so retain a backup and do not silently overwrite an existing ledger. No real customer exports belong in this repository.

## Firebase state
Project name: Daftar Insurance Ledger. Project ID: `daftar-insurance-ledger`.
The creation dialog reported "Your Firebase project is ready". Gemini and Google Analytics were disabled. The project overview, Spark/billing state, Firestore database, authorized domains and Authentication provider setup were not subsequently verified. No Firebase SDK configuration or credentials were retrieved. Verify these facts before integration.
The other Firebase project belongs to an unrelated game and must remain separate.

## Owner's next objective
Local-first use with reliable cloud reconciliation and the same confirmed data on the father's devices; a very simple access experience, no account-creation flow or recurring Google login. Firebase Spark only; remain within no-cost quotas. The owner has requested GitHub Pages for this project, superseding the earlier Firebase Hosting recommendation.

## Next work
1. Verify the source import in the dedicated repository, enable Settings > Pages > GitHub Actions if needed, and verify the Pages deployment and actual URL.
2. Verify the Firebase project's Spark plan and provision only the needed free products.
3. Design cloud synchronization before enabling it: durable pending operation queue, stable receipt IDs, server acknowledgments, merge/conflict handling for multiple offline devices, explicit failed/pending/synced status, and retained correction history.
4. Treat an anonymous Firebase identity as device-specific. It alone does not connect two devices to one ledger. Implement and test the chosen shared-ledger access/recovery design.
5. Keep downloadable backups; cloud sync is not a versioned backup system.
6. Test two isolated browser profiles: offline receipt, reconnect, second-device refresh, repeated sync, simultaneous edits, canceled receipt, interrupted queue and recovery. Never advertise cloud saving before acknowledgement.

## Collaboration
Use small branches and PRs. A second GPT can read this public repository; editing requires the owner's GitHub connector/Codex repository access. The GitHub Pages URL displays the application; the repository URL exposes the code and handoff. Do not give a general public ledger-write rule to solve access errors.

## Date and installment change (branch feature/date-installments-sync)
- Today's date is computed for Tehran at each render, every 30 seconds while open, on focus/pageshow/visibility return, and after reconnect. A fresh same-origin HTTP Date header (HEAD, nonce, no-store; service worker bypass) corrects device-clock skew online. Offline cannot know authoritative time if the device clock is wrong; the UI labels this state. Tests cover the Tehran midnight boundary and online skew.
- New plans default to installment payment, up to six regular payments: a positive initial amount on policy start, then first due one Jalali month plus 15 calendar days after start (Esfand 5 → Farvardin 20), followed by anchored monthly payments. Owner sets the actual down-payment percent/amount and can edit the first date, frequency, every date and every amount. No interest; integer remainder in last installment. Cash pays full price immediately. Existing saved schedules can be revised with audit history, retaining receipts and total. Older policies and schema-1/2 backups remain readable.
- **Firebase cloud sync is not live**. See [FIREBASE_SYNC_PLAN.md](FIREBASE_SYNC_PLAN.md) for the exact console setup, access design, low-read protocol and acceptance gate. The owner must provide verified configuration from the existing Firebase project; the available browser session is a Google sign-in wall, not the owner's Safari console.

## Firebase rules-only GitHub control plane (setup pending)
The owner uses a Chromebook, so the desktop browser extension is unavailable in this session. A separate service account with **only** `roles/firebaserules.admin` can be stored as the encrypted repository secret `FIREBASE_RULES_SERVICE_ACCOUNT_JSON`. See [FIREBASE_OWNER_SETUP.fa.md](FIREBASE_OWNER_SETUP.fa.md) for exact owner steps. The manual workflow `.github/workflows/firebase-rules-control.yml` is fixed to `main`, the dedicated repository and project `daftar-insurance-ledger`; operation `verify` tests Rules API access without mutation. Operation `publish` refuses the `SETUP_BLOCKED` deny-all placeholder until UID-scoped production rules, emulator proof and client sync exist. The workflow never runs on PR code or changes billing/Auth/Firestore records. Do not ask for or reveal the JSON key. No successful provider verification or cloud sync has happened yet.


## Chrome continuation — 2026-11-02 ET (latest state)

Verified through the owner's Chrome extension: Spark no-cost plan; empty `(default)` Firestore database at `me-central2`; live deny-all client rules; existing `Daftar GitHub Pages` web app; one dedicated Email/Password Auth user now exists. Email/Password was enabled in this session. Workflow run 41564719054 successfully verified the rules-only secret, without publishing rules or touching records. No service-account JSON or account password was read.

This branch adds a dependency-free REST sync client, one customer per document, an atomic business-data/pending-queue local save, stable-ID three-way merge, explicit conflict review with retained originals, update-time write preconditions, server readback acknowledgements, persistent device authentication, backup-first join preview, and emulator security tests. Public Firebase config belongs in `dist/firebase-config.js`; passwords and service-account keys never do. The sign-in screen explicitly asks the owner to retain access on this private device. There is no recurring Google login, credential-bearing URL or public write rule.

`firestore.sync.rules` is the reviewed candidate; `firestore.rules` deliberately remains deny-all and blocked from publication. Do not enable customer access until security-rule emulator tests pass and the owner confirms the exact access change. The candidate permits only the dedicated Auth UID to its own ledger and bounded customer documents. It denies everyone else, metadata changes, hard deletes and other paths. JSON payload semantics are validated by the client; the rules protect identity, path, envelope and size, not the internal JSON business schema.

Synchronization occurs at startup, focus/visibility return, reconnect, explicit retry and local save. It does not continuously stream updates while two devices stay open. Local edits fetch only pending customer documents, then conditionally write and server-read them; full pulls occur at open/focus/reconnect/manual sync. No minute polling. Last-online-check time is historical, not a promise another device has no newer edits. Session request/read limits bound repeated work.

Initial connection requires an explicit backup and preview. A nonempty local ledger is combined with cloud data, never replaced. Different stable IDs remain separate even when names match. Same-field changes and invalid combined balances produce conflicts. The whole-customer resolution screen retains both originals in decision history and downloadable backups. Restore-as-replacement and currency changes are refused after connecting. The father can be signed in once by the owner on each device. Clearing browser storage requires sign-in and connection review again.

Validation and remaining gates are recorded in VALIDATION.md. Live two-device acceptance, physical phone/offline checks, and migration of real records have NOT been performed. Never claim them from the in-memory tests alone.

Firestore emulator CI passed on run 41568147086: all three owner/anonymous/other-user authorization test groups passed, plus all 52 Node checks. Live rules still deny-all; no production customer records were created.

The complete REST transport test passed in run 41568951641 (four emulator groups); 54 local checks now pass, including 19 sync checks. Single-document commits put the update-time precondition in the JSON body. HTTP 400 FAILED_PRECONDITION also triggers reread/reconciliation. Both original customer versions are retained in the synced customer syncResolutions archive after an explicit resolution, so review history is portable across devices. Backups with unresolved originals reinstate the review requirement when connected again.


## Rules activation and professional interface — 2026-11-02 ET

The owner explicitly approved publishing the staged UID-scoped rules. They were published through Chrome in the dedicated Firebase project; the console shows an active published revision at 10:14 PM ET, with no unpublished changes. `firestore.rules` now matches the reviewed `firestore.sync.rules` exactly. The manual rules publisher refuses any source that differs from that reviewed candidate. Account sign-in on the ledger, live two-device acceptance, and migration remain pending; no real customer records were uploaded.

The visual update adds a slate navigation rail, warm-white workspace, teal balance emphasis, stronger typography, clearer table/status hierarchy, refined payment and backup forms, and responsive mobile navigation. All fonts and assets remain local. The application stays on the same GitHub Pages URL and retains its ledger storage keys, schema, amounts, date calculations and sync protocol. `dist/professional.css` is the final visual layer. Shell cache v9 includes that stylesheet.

Published interface checked through Chrome at the normal 1920px desktop viewport and a temporary 390×844 phone viewport. Dashboard, customer profile, and payment dialog render; no browser errors were captured. The page has no horizontal overflow at either width. A phone secondary-card currency label was clipped and is corrected by moving its unit to a separate line and allowing long amounts to wrap. Shell cache v10 carries the correction. No receipt was saved during visual QA.


## Father's phone target — supplied by owner

Samsung Galaxy A20, SM-A205F/DS; physical panel 720×1560 pixels, portrait, 6.4 inches. These are physical pixels, not an observed CSS viewport. The targeted UI uses a conservative 360 CSS-pixel width and must work at both 360×780 and reduced-height 360×660, plus a 360×480 form viewport. Actual Android display/font scaling and browser controls remain device-dependent; do not claim physical-device verification.

The focused UI patch preserves desktop styles and all business/storage/sync behavior. At widths ≤400px it compacts summary spacing, enlarges relevant text and tap targets, presents customer rows as readable name/balance/status cards, and gives insurance/payment forms one column and a scrollable dialog in short viewports. Shell cache v11 includes it. No real records or credentials were used for UI verification.

## Recurring default interval correction

The owner clarified that EVERY installment, not only the first, should default to one Jalali month plus 15 calendar days. New policies now use `month-plus-15` by default. Starting from the previous generated due date, add one Persian calendar month (clamping its day to the destination month's end), then add 15 calendar days. This is a calendar rule, not a fixed 45-day duration. The new form option is «هر ۱ ماه شمسی و ۱۵ روز (پیش‌فرض)», and the saved policy heading names the interval correctly. Explicit monthly/weekly choices and existing saved dates remain unchanged. Custom dates and amounts still work. The ledger validator and backup reader accept the new frequency alongside existing values. Cache v12 ships the new code.

57 Node checks pass. New coverage verifies the full recurring date sequence across Persian New Year, non-leap Esfand clamping, custom first dates, exact amounts, backup round trips, and unchanged explicit monthly/weekly behavior. A new policy starting 1404/12/05 defaults to regular due dates 1405/01/20, 1405/03/04, 1405/04/19, 1405/06/03, 1405/07/18.

## Owner clarification — first due + 1 Jalali month + 15 days, subsequent due monthly (2026-11-03 ET)

This decision supersedes the previous "every installment month-plus-15" default in the historical section above. The user's final intended rule is: first regular installment one Jalali month and 15 calendar days after policy issuance; each later regular installment exactly one Jalali calendar month after the first, maintaining the first due-day anchor. For an issuance on 1404/12/05 with five regular installments: 1405/01/20, 1405/02/20, 1405/03/20, 1405/04/20, 1405/05/20. This is represented by the existing `monthly` schedule branch with the existing `firstInsuranceDue()` initial date. Set it as both makePolicy's default and the form's explicitly selected option. Preserve manual first-date/individual-date/amount editing, explicit `month-plus-15` recurrence for existing policies and user choice, explicit weekly cadence, and persisted schedules without regenerating them. Offline shell cache version v13. No Firebase code, credentials, Firestore rules, schema or saved customer records changed by this adjustment. Firebase production sign-in and two-device sync still require live acceptance testing.


## 2026-11-03 owner login failure / bug fix

Owner reports Firebase one-time sign-in fails even after password reset; screenshot from iPhone in-app ChatGPT browser shows the generic red error. A source audit found deterministic diagnostic bugs: the form swallowed all errors from `sync.signIn()`, and `FirebaseRest.request()` favored generic `error.status` over the useful `error.message`, hiding root cause. Also a successful login followed by Firestore join failure was incorrectly reported as failed login. The fix provides bounded Farsi errors by category, separates authentication from join, never exposes passwords/tokens/email in error output, and changes offline shell cache to v14. Login-error unit tests were added. A single fake-account-only production Identity Toolkit smoke test (GitHub Actions run 41756762287) returned HTTP 400 INVALID_LOGIN_CREDENTIALS and all 62 tests passed; it was deleted before merge. This confirms the public API key/project auth endpoint responds from CI, NOT the actual owner's credentials, UID, referrer rules or iOS browser behavior. Never assume login is repaired until a real owner sign-in succeeds. Owner next action: open the GitHub Pages URL in Safari/Chrome outside ChatGPT, compare entered email against Firebase Authentication → Users and exact dedicated UID from public config, and report the new displayed error code only. Never ask for a password, never change rules or create a replacement Auth account casually. Cloud sync remains pending real-world acceptance.


## iOS Safari Firebase networking incident — 2026-11-03 ET

Owner reports new actionable error `NETWORK_UNAVAILABLE` on iPhone, after password reset, while using an interface labeled Safari. A top-left `Back to ChatGPT` link on iOS is **not** proof the owner is using an embedded browser; it may appear when returning from standalone Safari. Avoid telling owner that Safari is not Safari. The Auth REST client fails in the fetch transport (or CORS/preflight), before Firebase returns any credential-specific error; this is not evidence their password is wrong.

A GitHub Actions runner already successfully reached the production Firebase Identity Toolkit API with dummy credentials using the public configured key and received HTTP 400 `INVALID_LOGIN_CREDENTIALS` (run 41756762287), so the public API key/backend works from that environment. It does not prove the request succeeds over owner's iPhone 5G/Wi-Fi or the owner account UID.

This branch adds a **user-triggered diagnostic** to the actual sign-in dialog, shown only after network/response failures. The diagnostic checks: (a) GitHub Pages HEAD online with SW clock-probe bypass, (b) Identity Toolkit host GET in no-CORS mode to measure network reachability, (c) full Firebase password-sign-in API POST using only `daftar-connectivity-check@example.invalid` plus a made-up nonsecret password (expected 400 invalid credentials), never the user's typed email/password. It returns a stable result: `SITE_... | GOOGLE_... | AUTH_...` plus Persian instructions. No Firestore writes, real user sign-ins, token output or sensitive data. The test is run only by tapping «بررسی اتصال Firebase بدون رمز». Local/offline shell cache bumped to v15. Browser-origin/CORS/content blocking, iCloud Private Relay, DNS, carrier and network/VPN policies remain plausible but **unconfirmed** until the owner's phone-specific result is obtained. If site OK but Google not reachable, compare Wi-Fi vs cellular and content blockers; if Google reachable but Auth POST fails, inspect browser network/filtering; if Auth reachable, credential-specific sign-in can be attempted again. Never turn off Firebase security rules, change billing, publish a credential or create a new Auth account as a workaround. Preserve all customer records and offline queue.

## Safari sign-in root-cause fix — 2026-11-03 ET

Owner ran the independent device-specific network probe and reported **SITE_OK | GOOGLE_REACHABLE | AUTH_REACHABLE** on the same iPhone that consistently showed NETWORK_UNAVAILABLE in the login form. The newer login screen and its diagnostic button are now visible, so the main app also loaded the updated assets. Comparing request paths exposed a deterministic browser API usage bug: the real login client used `fetcher=globalThis.fetch` in `FirebaseRest`, then called `this.fetcher(url,options)`. Native browser fetch may reject a receiver other than Window/WorkerGlobalScope (`TypeError: Illegal invocation`), and the existing catch incorrectly surfaced the error as `NETWORK_UNAVAILABLE`. The independent probe invoked its fetcher as a plain function and succeeded. Fix: wrap the default in `(...args)=>globalThis.fetch(...args)`, which invokes fetch on globalThis with the correct browser receiver. Keep injected fake fetchers unchanged. Add a receiver-check regression test simulating Safari's native fetch brand-check; update shell cache to v16. This is a strong code-level explanation, but do not claim actual owner sign-in success until the user retries on device. No Firebase configuration/rules, credentials, local records or schema changed. Owner should refresh the live app after GitHub Pages deployment and retry once, then report whether the preview appears or whether a new error code appears. Do NOT delete Safari data.
