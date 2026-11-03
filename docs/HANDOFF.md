# Daftar: handoff for the next GPT

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


## Chrome continuation — 2026-11-02 ET

Verified through the owner's Chrome extension: Spark no-cost plan; empty `(default)` Firestore database at `me-central2`; live deny-all client rules; existing `Daftar GitHub Pages` web app; one dedicated Email/Password Auth user now exists. Email/Password was enabled in this session. Workflow run 41564719054 successfully verified the rules-only secret, without publishing rules or touching records. No service-account JSON or account password was read.

This branch adds a dependency-free REST sync client, one customer per document, an atomic business-data/pending-queue local save, stable-ID three-way merge, explicit conflict review with retained originals, update-time write preconditions, server readback acknowledgements, persistent device authentication, backup-first join preview, and emulator security tests. Public Firebase config belongs in `dist/firebase-config.js`; passwords and service-account keys never do. The sign-in screen explicitly asks the owner to retain access on this private device. There is no recurring Google login, credential-bearing URL or public write rule.

`firestore.sync.rules` is the reviewed candidate; `firestore.rules` deliberately remains deny-all and blocked from publication. Do not enable customer access until security-rule emulator tests pass and the owner confirms the exact access change. The candidate permits only the dedicated Auth UID to its own ledger and bounded customer documents. It denies everyone else, metadata changes, hard deletes and other paths. JSON payload semantics are validated by the client; the rules protect identity, path, envelope and size, not the internal JSON business schema.

Synchronization occurs at startup, focus/visibility return, reconnect, explicit retry and local save. It does not continuously stream updates while two devices stay open. Local edits fetch only pending customer documents, then conditionally write and server-read them; full pulls occur at open/focus/reconnect/manual sync. No minute polling. Last-online-check time is historical, not a promise another device has no newer edits. Session request/read limits bound repeated work.

Initial connection requires an explicit backup and preview. A nonempty local ledger is combined with cloud data, never replaced. Different stable IDs remain separate even when names match. Same-field changes and invalid combined balances produce conflicts. The whole-customer resolution screen retains both originals in decision history and downloadable backups. Restore-as-replacement and currency changes are refused after connecting. The father can be signed in once by the owner on each device. Clearing browser storage requires sign-in and connection review again.

Validation and remaining gates are recorded in VALIDATION.md. Live two-device acceptance, physical phone/offline checks, and migration of real records have NOT been performed. Never claim them from the in-memory tests alone.
