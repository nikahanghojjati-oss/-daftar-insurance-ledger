# Validation — 2026-11-01

## Explicit installment timing labels — November 7, 2026

Owner confirmed the existing generation rule and requested visible offsets from issuance instead of the incomplete monthly label. The default option now spells out the first two intervals. Form rows and saved desktop/mobile installment rows show the actual calendar-month/day interval from issuance plus their existing exact date. Derive saved issuance only from an existing down-payment entry; omit unprovable offsets on older records without one. This changes presentation only, including recomputing the display when a custom date is edited. It does not regenerate or alter any saved schedule, receipt or currency. Calendar month + 15 days is not uniformly 45 elapsed days.

The existing Home candidate 723a189724d66f28226b799a16e8eca26d40dce7 passed Node/source 42397352270, Chromium 42397352267 and Firebase emulator 42397352265. The browser script is extended to verify all six offsets in an actual new-policy form and saved profile (issuance 1404/12/05), an edited second due date showing 2 months + 16 days, and phone layout. Fresh checks on the extended candidate are required before merge.

## Home today/tomorrow summary — November 7, 2026

Added two compact exact-day summaries above the Home account statistics, with remaining amounts, open counts, Persian dates and direct navigation to the matching Dues filter. Reads the same pending installment allocation used by profiles; no accounting, persistence or Firebase behavior changed. Cache protocol advanced consistently to v20.

Local validation: all 78 Node tests pass; app and browser script syntax and diff checks pass. Local Chromium was attempted but could not launch because the executor refused its singleton socket. CI browser acceptance and visual inspection are pending at the initial feature commit; no browser or publication success is claimed from those local checks.

The added scripts/browser-daily-dues.cjs uses only fictional local records and rejects unexpected Google API calls. It exercises two today dues totaling 800,000 toman after a partial receipt, one tomorrow due totaling 1,200,000 with a second tomorrow policy already paid, five older overdue items, exact-day navigation, unchanged records from browsing, payment/reload updates, offline Tehran midnight rollover, empty rial state, and 360/390/768/1280px layout checks.

Initial application candidate 0bf014c78fbedce162014149f63bcf2044d04242 passed Node/source run 42397205672 and Chromium run 42397205664, including both the existing two-account sync scenario and the new daily-dues scenario. Downloaded screenshots at 360×660 and 1280×900 were inspected; the phone view prompted a small final adjustment to align amounts and put both currency labels on their own line. The browser clock is paused before the midnight test so slow screenshots cannot advance its day accidentally. Final-head CI remains required before merge.

## Shared-access production rule publication — November 7, 2026

Manual publish run https://github.com/nikahanghojjati-oss/-daftar-insurance-ledger/actions/runs/42396610260 succeeded at 12:30 PM ET on reviewed main commit 8044851ae6a957d8124ddfc4bb7be58a5d7c7155. Logs confirm operation publish and FIREBASE_RULES_EXACT_SOURCE_OK for daftar-insurance-ledger, SHA-256 c24f634377c94656335cb074bd74e476cb9f61162e12d6c2ecb8553e3e241f9b. The publisher read back the active release and compared its sole source file byte-for-byte with the reviewed rules. Both supplied authorized UIDs can access the original ledger path. No production customer data was read or written. This supersedes the earlier manual-publication-pending status; actual father sign-in, phone persistence and physical two-device exchange remain NOT CHECKED.

## Shared account access candidate — November 7, 2026

Two allowlisted accounts use the original ledger path. No customer migration, ledger/schema rewrite, payment calculation change, browser-storage reset or production record operation is part of this update. Old sessions infer the original auth identity; new sessions persist authUid separately and reject identity changes during renewal. Rules retain immutable metadata, bounded envelopes, no hard deletes and deny other users/paths.

Local checks: 78/78 Node tests pass, including five shared-access regressions. Syntax checks pass for the updated client, browser scenario and emulator tests. Local Chromium was attempted but the executor refused its singleton socket (`Operation not permitted`); browser acceptance must run in CI. No physical-device or production-account sign-in has been performed.

Application candidate `9a556489899b8b2227e547fedc3e12725e234c14` in PR #18 passed all checks: Node/source run 42395532970; browser run 42395532921; Firebase emulator run 42395532965. The browser scenario used two distinct synthetic authorized identities and the actual dad login form, with token renewal, preserved legacy session, offline saving/reload and reconnection converging to 300,000 toman with exactly two receipts and two writes. Backup freshness and 360/1280px widths passed without JavaScript errors. The emulator's five groups passed, including the father's authenticated read/write of the existing customer's receipts plus denied separate-ledger paths, deletes, metadata overwrites and other users. The REST concurrency test uses an emulator-only admin transport separately from those identity authorization checks.

All fixtures are fictional; mocked browser transport and emulator results do not prove real-device production acceptance. Code publication is tracked by PR #18. Manual Firebase rule publication remains pending: the GitHub connector has no workflow-dispatch operation, local gh is not authenticated, and the available cloud browser is signed out. Do not change the manual workflow or expose its rules-only secret to work around that boundary. Owner continuation: open the existing firebase-rules-control.yml Actions page while signed in, choose Run workflow, branch main, operation publish, then verify the exact-source readback success. No production customer data or credential was read or written in this update. The change cannot promise zero data loss; keep independent downloaded backups and perform the physical-device acceptance with fictional data.

## Automated

The initial 12 passing Node tests:

1. Persian/Arabic/Latin digit parsing and rejection of fractional/negative/unsafe amounts.
2. Known Persian calendar dates, valid/invalid leap days, invalid civil dates.
3. 1,461 calendar-day round trips and anchored month-end schedules.
4. Exact monthly/weekly installment arithmetic, including last-installment rounding.
5. Debt changes only for actual payments; partial, early and full settlement.
6. Overpayment, zero payment, future actual payment and invalid schedule rejection.
7. Payment cancellation and consistent customer/dashboard/due totals.
8. Fully prepaid policy with no pending dates.
9. Backup round trip, malformed schema, duplicate IDs and inconsistent sums rejected.
10. Service-worker complete-shell caching, offline navigation and asset fallback.
11. Online authentication failures are returned even with a cached app shell.
12. Failed shell installation cannot advertise offline readiness.

## Browser interaction, Chromium

Verified in the local preview using fictional records only:

- Currency selected explicitly; personal ledger starts empty.
- Add customer, view profile, add policy with Persian numeric input.
- Total 1,000,001; down payment 100,000; three installments 300,000 / 300,000 / 300,001.
- Additional 100,000 payment produces paid 200,000 and owed 800,001; first installment shows partial payment.
- Overpayment 800,002 rejected and dialog stays open with a Farsi explanation.
- Full settlement persists after reload and removes all remaining payment dates.
- Cancel last payment restores 800,001 owed.
- Search by Latin phone digits finds Persian-digit customer phone.
- Backup downloaded, restore preview agrees with totals, confirmed restore returns same dashboard totals.
- 390px phone iframe renders an RTL layout with no horizontal page overflow (content 375px, scroll width 375px), four accessible bottom-navigation actions.

## Limits

The HTTP local preview cannot register service workers. Offline request behavior is exercised by the service-worker test harness; deployment readiness is checked separately on the private HTTPS host. Physical iPhone/Safari behavior has not been tested.

## Everyday Helper update — schema 2

17 tests pass (12 original checks plus 5 recovery checks): stable payment retry IDs; duplicate detection without silently deleting legitimate separate receipts; cancellation/undo retaining values and audit; overpayment protection when undoing; and schema-1 migration plus cancellation-aware backup round trips.

Additional Chromium UI verification on existing schema-1 fictional records:

- Existing paid/owed totals unchanged when loading the new app.
- Type an unfinished customer, reload, resume the exact name and phone; customer count and money unchanged until explicit save.
- Discard a draft; reload does not resurrect the finished/discarded form.
- A matching payment cannot save until its duplicate warning is acknowledged. A separately confirmed receipt does save.
- Cancel that receipt: owed returns to 800,001, paid to 200,000; original receipt remains visible with a restore action.
- Restore that same receipt: owed becomes 700,001, paid 300,000, stable receipt retained.
- 390px phone profile uses installment cards; measured page client width and scroll width both 375px.

Hosting was found public at the beginning of this update, despite the earlier explicit private-only instruction. Owner-only access was restored before publication work. No customer data was uploaded; browser test records remain local to the preview origin.

## Public-access, font and offline update

25 automated tests pass. New regression coverage: worker installation failure and indefinite-wait timeout, current-cache version handshake, unsupported contexts/registration errors, complete static file inventory, valid bundled WOFF2 and OFL license, and offline font/module retrieval. Source syntax checks pass. Hosting access update returned public revision 4. Hosted browser verification is recorded below after publication.

Hosted verification (v5): unauthenticated Cloud Browser opened the public URL. The current-version complete-cache handshake reported «آماده استفاده آفلاین». Root cause: Sites redirects /index.html to /; the original worker rejected all redirects. The fixed worker accepts only the canonical same-origin HTML redirect and verifies app markup; login/external redirects and 200 login pages are regression-tested and rejected. A fictional 100,000-toman demo payment persisted after full reload (paid 16,100,000; owed 26,900,000). No real customer data used. Browser page font family verified as Vazirmatn. Physical-device airplane-mode testing is not established by the browser APIs available here; offline navigation/asset/font paths are exercised in the worker harness.

## Standalone GitHub Pages preparation — 2026-11-02

26 Node tests pass. New regression covers /daftar/ project subpaths: all 11 shell assets remain beneath that path; font and navigation resolve from cache offline; activation deletes only caches for this app path and leaves other GitHub Pages projects untouched. Syntax checks pass. The Pages workflow runs tests before uploading dist/. Repository creation, workflow execution, hosted Pages URL and browser verification on the github.io origin remain pending.

## Date and installment branch — 2026-11-02 ET

32 Node tests pass and syntax checks pass for app/core/clock/service-worker. New checks cover Tehran midnight/new year, HTTP Date correction for a two-day device-clock skew, missing server timestamp rejection, cache bypass for the clock request, Esfand 5 → Farvardin 20, six-payment limit, exact sums and custom dates/amounts, cash settlement, and revision audit without changing existing receipt IDs or balances.

The online server clock was observed on the published GitHub Pages host using a fresh `HEAD /-daftar-insurance-ledger/index.html?__daftar_clock=<nonce>` request: HTTP 200, Date header present, Age 0. The feature branch is not yet deployed to Pages; live browser UI and real-device midnight/offline behavior remain unverified. Firebase console and cross-device sync are still not configured or tested; no real customer data has been sent to Firebase.


## Firebase rules control-plane preparation — 2026-11-02 ET

35 Node tests pass, including three checks for the manual-only workflow, fixed repo/main/project, missing credential refusal and blocked publication of the deny-all placeholder. The workflow YAML parses and the publisher script passes `node --check`. No GitHub Secret is present or verified yet, and no Firebase Rules or customer data was mutated. A first successful manual `verify` workflow, then UID-scoped rules/emulator tests and two-device sync acceptance are still required.


## Sync continuation — 2026-11-02 ET

54 local Node tests pass, including 19 new sync checks. Coverage: two independent persisted engine states; first upload and second-device join; separate offline receipts; concurrent same-field conflict; independent fields/customers; merged-overpayment refusal; lost write response and closure/retry; stale update-time precondition; local edit during upload; cancellation/restore; stale join preview; different currencies; conflict originals retained across later remote updates; failed server readback; portable backup excludes device queue; password never persisted; wrong-account refusal; token refresh; REST pagination/preconditions; incremental changed-customer reads. Existing calendar, finance, recovery and offline-shell tests still pass; offline shell now includes all four local sync modules. Syntax checks pass.

The sync engine tests use a fake remote with persisted independent device states. They do NOT establish real Firestore or physical two-device correctness. A separate Firebase sync acceptance workflow runs the candidate rules in the Firestore emulator with owner/other-user/anonymous contexts. Emulator result is pending when this branch is first prepared. Live rules remain deny-all. No real records were uploaded. Live browser verification and real two-device acceptance are still required before migration.

Emulator evidence: https://github.com/nikahanghojjati-oss/-daftar-insurance-ledger/actions/runs/41568147086 completed successfully. Anonymous/other-user reads and writes fail; only owner reads/lists bounded customer envelopes; invalid metadata/envelopes, metadata overwrites, other paths and deletes fail. This tests the candidate `firestore.sync.rules`, not a live deployment.

The full REST transport emulator run 41568951641 passed four test groups, including two independently persisted engine states through actual Firestore REST reads, writes, conditional commits and server readbacks. Concurrent receipts converge; a stale version is rejected and a repeated sync does not write duplicate receipts. Transport tests use an emulator-only admin token; identity authorization is verified separately by the three authenticated/unauthenticated rule groups. No production credentials or data are used. Conflict decisions now retain both originals inside the synced customer archive, and backups with unresolved originals restore the review requirement. Physical devices and production two-device acceptance remain NOT CHECKED.


## Rules activation and visual refresh — 2026-11-02 ET

Owner-approved UID-scoped rules were published in Firebase Console and the console displayed the published 10:14 PM ET revision. The source selected for future publication is now byte-identical to the emulator-tested candidate. A regression test rejects placeholders and modified/unreviewed rule sources. The 54 Node checks pass, with the offline shell inventory updated for the local visual stylesheet; source syntax checks pass. Desktop and phone presentation will be verified after deployment. Live account sign-in, production two-device sync, and migration of real records remain NOT CHECKED.

Live Chrome visual QA after PR #5: dashboard, customer profile and payment form at 1920px; 390×844 responsive navigation, dashboard and profile. Document/body widths match each viewport (1920 and 390), with no page overflow. No browser errors were captured. The phone balance label clipping found during QA is corrected in the final CSS. No customer or payment mutation was submitted during these checks. Account sign-in and live two-device sync still remain pending.


## Galaxy A20 UI target

The owner supplied Galaxy A20 SM-A205F/DS and 720×1560 physical panel pixels. CSS viewport is not established by those physical specs. Browser QA targets 360×780, 360×660 with browser space reserved, and a reduced 360×480 form viewport. This is responsive-layout verification, not a test on the father's actual handset or its keyboard. All 54 Node checks remain applicable; no new tests mirror the CSS. Desktop and larger-phone styles remain outside the new ≤400px overrides.

## Recurring calendar default

57 local tests pass after correcting the default to one Persian calendar month plus 15 days for each successive installment. Three new regression cases cover the complete expected date sequence, custom first dates, non-leap Esfand clamping (calendar recurrence differs from a fixed 45 days), exact totals, backup acceptance, and unchanged explicit monthly/weekly intervals. Existing persisted schedules are not regenerated. Source syntax and diff checks pass. Live form verification follows deployment.

## Installment default correction — 2026-11-03 ET

Owner clarified final schedule: first installment = issuance + 1 Jalali month + 15 calendar days; all subsequent installments monthly, anchored to the first due date. Code default and new-policy form selection now use the existing `monthly` logic. A new 5-Esfand regression expects Farvardin 20, Ordibehesht 20, Khordad 20, Tir 20, Mordad 20. An explicit `month-plus-15` regression preserves older recurring schedules and their backup validation, with existing calendar, custom date, amount, and weekly tests remaining in place. Cache v13 forces a fresh offline shell. CI/runtime check is required on the PR; no live phone or Firebase claim from this change.


## Login diagnostics — 2026-11-03 ET

The login screenshot shows a generic error despite repeated attempts and a password reset. Source audit identified that the UI caught all Firebase sign-in errors and replaced them with one generic string. The REST transport further preferred `error.status` (usually `INVALID_ARGUMENT`) over the actionable `error.message` code. Also, a failed Firestore join after successful authentication was wrongly labeled as a login failure.

The code now maps login errors to clear, bounded Persian guidance without echoing passwords, tokens, email addresses or untrusted server error bodies. Unit tests cover invalid credentials, wrong account UID, disabled Email/Password provider, blocked key, connectivity, and session non-persistence on failure. Offline cache v14 refreshes the app shell. A **one-time** live Auth smoke test sent only a reserved example.invalid dummy email/password to the production Identity Toolkit endpoint using the public web-app API key. GitHub Actions run 41756762287 returned HTTP 400 `INVALID_LOGIN_CREDENTIALS`, proving that the public key/project endpoint works from a GitHub runner. 62 tests including this temporary check passed; the temporary check was then removed. This does **NOT** establish whether the user's actual Firebase Authentication email matches the dedicated UID, whether the password was reset on that exact user, or whether the iOS in-app browser reaches Identity Toolkit. No real account was signed in and no data was uploaded. Next acceptance step: open GitHub Pages directly in Safari or Chrome, attempt sign-in once, read the new exact error code, verify Authentication → Users email and UID if credentials fail; avoid creating a new user.


## iPhone Firebase network diagnostic — 2026-11-03 ET

The owner reproduced `NETWORK_UNAVAILABLE` in the live mobile UI, so the current blocker is HTTP transport, not a confirmed bad password. Production public API-key smoke from a GitHub runner returned the expected 400 invalid dummy credentials; phone network is still untested. The new `inspectFirebaseConnection` module performs three opt-in, non-secret checks (same-origin online HEAD with SW bypass; opaque no-CORS Identity Toolkit GET; synthetic-invalid-credentials POST with actual Firebase public key) and returns controlled Persian explanation and machine-readable code. It does not reveal or use the form email/password, sign in as anyone, create records, change rules, or touch Firestore. Four automated cases cover reachable Auth, blocked Google, blocked POST, and key/referrer rejection. The diagnostic control appears in the login modal only after a transport/network failure. Offline shell v15 includes connectivity.js; offline-shell inventory tests updated for 19 files. Must pass all test suites before merge. True iOS and owner-sign-in acceptance remains pending and cannot be inferred from runner success.

## Safari fetch receiver fix — 2026-11-03 ET

Owner device-specific independent probe returned SITE_OK | GOOGLE_REACHABLE | AUTH_REACHABLE while the regular login page displayed NETWORK_UNAVAILABLE. Reproducing the code path showed that `FirebaseRest` stored native `globalThis.fetch` then invoked `this.fetcher()`, binding the receiver to the client instance. Some native browsers reject such calls with Illegal invocation before network activity. Regression test installs a receiver-checking browser-like fetch and verifies default FirebaseRest sign-in uses global receiver and persists only Firebase tokens, not password. The fix uses an arrow wrapper for default fetch, and bumps offline shell version to v16. Firebase Auth real-account login and physical device sync still require owner acceptance after Pages deployment.


## Single-owner reliability release — November 7, 2026

The owner canceled the two-GPT split. Sol implemented this release alone; the former split-plan draft #16 is closed. The ordered backlog is docs/WORK_PLAN.md.

Application candidate: `a150293c457beb74292e149cfb48773ccf117368` in PR #17. Local Node suite: 73/73 pass; changed JS syntax and diff checks pass. Three new independent cases cover transport-only backup freshness, remote/local receipts and acknowledgement, retained conflict/cancellation history, and revision-less legacy ledgers. They exercise the same revision helper used by real app writes. No receipt or calendar calculation changes.

CI passed:

- Node/source checks: https://github.com/nikahanghojjati-oss/-daftar-insurance-ledger/actions/runs/42394129962
- Firebase rules and real REST emulator transport: four groups pass, including isolated persisted device states, offline merge, preconditions and readbacks: https://github.com/nikahanghojjati-oss/-daftar-insurance-ledger/actions/runs/42394129957
- Chromium UI, two isolated contexts: https://github.com/nikahanghojjati-oss/-daftar-insurance-ledger/actions/runs/42394130049

The browser test uses intercepted REST with exclusively fictional records and synthetic session tokens, never the production account. It proved a downloaded backup remains current after a no-change sync; a 100,000-toman payment reaches the other session; retained access survives reload after expired-token renewal; a second 200,000-toman receipt survives offline saving and offline reload; and reconnection converges to 300,000 paid with exactly two stable receipts and two customer writes. No page JavaScript errors. No horizontal overflow at 360×660, 360×480 and 1280×900. Phone and desktop screenshots were downloaded and inspected. The initial screenshots contain transient download/sync feedback; the assertions verify settled data separately. Artifact retention is seven days; the reusable script is scripts/browser-sync.cjs.

Local Chromium could not launch because the executor refused its Unix socket; shared Chrome could not reach the separate preview server. Browser proof above comes from CI Chromium, not those failed local attempts.

A local CPU comparison of portable business content with ten fictional receipts per customer preserved revisions at 100/500/1,000 customers. Serialized ledgers were about 143/717/1,435 KB; single comparison observations were 14/37/50 ms on this executor. These are diagnostic observations, not benchmarks on the father's phone and not proof of faster overall sync.

Still NOT CHECKED: real-account login/persistence and expired-token renewal on the actual Safari/Android devices; production A-to-B and B-to-A payment exchange; physical-device offline recovery. The owner's screenshot establishes one displayed successful online check only. Cloud UI timestamps remain historical checks, not a claim that every device is current.

