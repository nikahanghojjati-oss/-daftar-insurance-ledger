# Validation — 2026-11-01

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
