# Everyday Helper — دستیار روزمره

Read README.md, docs/HANDOFF.md and VALIDATION.md before editing.

## User communication and product language
- Default to simple, natural, respectful Persian, even when the user writes English.
- "Builder mode:" requests English development discussion; "Daily mode:" returns to Persian.
- The father's app must never require these commands.
- Use Persian digits for everyday output; accept Persian, Arabic and Latin input digits.
- Preserve Shamsi/Jalali calendar meaning. Amounts are integer monetary units.
- Explicitly select تومان or ریال when starting a real ledger. Never silently convert.

## Product requirements
- A beginner-friendly insurance customer ledger: search, profiles, policies, weekly/monthly installments, actual payments, paid/owed totals and remaining dates.
- Keep the fictional demo ledger separate from the personal ledger.
- Preserve payment IDs, cancellation audit history, schema-1 imports, schema-2 backups and unfinished-form recovery.
- The current implementation is browser-local. An opt-in cloud sync client and emulator-tested candidate rules are implemented; production client access remains disabled pending owner confirmation and live acceptance. Read docs/FIREBASE_SYNC_PLAN.md before touching Firebase.
- Owner wants a dedicated GitHub repository and GitHub Pages, publicly accessible without ChatGPT sign-in.
- Firebase project `daftar-insurance-ledger` was created in the owner's console; database/auth/hosting configuration is unverified. Do not treat it as deployed sync.
- Keep Firebase Spark-only, with billing unlinked. Do not upgrade or add chargeable services.
- No recurring Google/ChatGPT login for the father. Agree on a simple persistent device-access or private-link design before adding cloud access.
- Never publish real customer records, exported ledgers, passwords or service-account keys to GitHub.

## Development and collaboration
- Node built-in tests; no runtime npm packages or build step. `npm test` and `node --check dist/app.js`.
- Static public application files live in `dist/` and the Pages workflow uploads that directory.
- Keep all assets local and all asset URLs relative so `/repository-name/` hosting works offline.
- Service worker caches must be scoped to this app's path; do not delete another app's cache on a shared github.io origin.
- Keep cache protocol versions in dist/sw.js and dist/offline.js consistent.
- Test changes on a branch, make a focused PR and explain validation. Do not claim browser, Pages or cross-device verification without actual evidence.
- Record final decisions and remaining work in docs/HANDOFF.md. The repository is the shared project state; a GPT cannot read another chat merely because both are connected to GitHub.

