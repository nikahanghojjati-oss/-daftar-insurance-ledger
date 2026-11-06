# Daftar Insurance: long-term working plan for two GPTs

Plan version: 1.0. Prepared November 6, 2026, America/New_York.

Repository: https://github.com/nikahanghojjati-oss/-daftar-insurance-ledger

Application: https://nikahanghojjati-oss.github.io/-daftar-insurance-ledger/

Planning baseline: `fad239e36510c5aa8cab9261a1d0e280572e1c22` on `main`.

## 1. Outcome and ownership

Build a dependable, simple Persian insurance ledger for the owner's father: easy payment entry, correct balances and dates, durable recovery, understandable synchronization, and good performance on his phone. Keep the current four main navigation actions.

| Owner | Responsibility | Work packages | Estimated effort |
| --- | --- | --- | --- |
| GPT A: Sol, the assistant in this chat | Data accuracy, sync, persistence, backup semantics, resource use, core performance, technical integration | A01–A12 | 36 points |
| GPT B: a separate GPT | Persian mobile UI, form clarity, customer lookup, daily collection workflows, statement presentation, usability verification | B01–B12 | 36 points |

Points are relative estimates, not hours, deadlines, or proof of an exact 50/50 runtime split. Integration work is included in A12; usability regression work is included in B12. Re-estimate after each milestone, and move unopened packages by written agreement if effort drifts substantially. Every package must retain exactly one implementation owner.

This is a working backlog and handoff, not a claim that features have been implemented. The separate GPT packet is ready to receive; a separate external chat has not been contacted or started by this document.

## 2. Current evidence and existing capabilities

The following sources were checked for this plan: `AGENTS.md`, `README.md`, `docs/HANDOFF.md`, `VALIDATION.md`, the current main branch, repository file inventory, open PRs, and the sync/app code inspected in this conversation. Documentation contains historical statements that contradict later implementation notes; A01 must reconcile them rather than copy old status as current truth.

| Area | Baseline |
| --- | --- |
| Main source | Still at the planning SHA above when checked November 6. |
| Safari fetch fix | PR #14 merged; current code wraps native fetch with its proper receiver. |
| Diagnostics work | PR #15 remains open at `f997e7415a95065b2cb164aca69cefdfac358f24`; inspect its current state before modifying related UI/cache code. Do not rebuild or assume it has shipped. |
| Phone observation | Owner screenshot shows a recorded successful online check at 09:05. This is evidence of the displayed first-device success state, not a full physical-device acceptance run. |
| Production gates | Persistence after reopening, token refresh, real record exchange between two devices, and physical offline recovery remain unverified in the evidence available here. |
| Already implemented | Customer search, profiles, policies, installment schedules, actual payments, partial/full payment, duplicate warnings, stable payment IDs, cancellation/restoration history, drafts, JSON backup/restore, validation, offline shell, and optional Firebase REST sync. Improve these rather than rebuilding them. |
| Architecture | One Firestore document per customer, including that customer's policies/payments; a separate ledger metadata document; device-local ledger and upload queue. |
| Main scaling issue | Full checks list all customer documents. Saving a changed customer uses targeted reads/write/readback. Rendering and local serialization also grow with ledger size. |
| Backup issue to reproduce | Sync updates write a new ledger revision even for sync metadata changes; backup freshness compares against that revision. A02 must prove and correct resulting false backup reminders. |

Preserve the latest documented schedule decision: first installment is issuance plus one Jalali month and 15 calendar days; subsequent installments are anchored monthly. Existing explicit recurring month-plus-15 and weekly schedules retain their meanings. Do not silently change saved dates or treat a calendar month plus 15 days as a fixed 45-day interval.

## 3. Product boundaries

1. Keep Persian RTL, mixed Persian/Arabic/Latin numeral entry, explicit toman/rial units, local fonts, and simple language.
2. Keep Firebase Spark, billing unlinked, and GitHub Pages. Avoid paid infrastructure and runtime framework migrations for this work.
3. Preserve receipt identities, actual-payment semantics, duplicate handling, cancellation history, drafts, old backups, and existing records.
4. A saved draft is not a payment. An installment becoming due is not money received. Offline readiness, local saving, cloud acknowledgement, and backup freshness are separate facts.
5. Never silently overwrite a conflicting version, merge customers only because names match, convert currencies, or resolve a financial conflict using last-write-wins.
6. Use fictional data for tests, screenshots, and public evidence. Do not commit customer exports, account credentials, tokens, or private console contents.
7. Initial improvements require no production rules, account, database, or billing changes. Scope later migrations separately with compatibility and recovery evidence before executing them.
8. Do not add SMS, automated customer messages, AI advice, new account roles, payment processing, interest products, or complex dashboards to the committed backlog. Revisit only if requested after core reliability is demonstrated.

## 4. Delivery sequence and exit gates

There are four milestones, delivered through small PRs. They are ordered by evidence and dependencies rather than promised calendar dates. Review the backlog at each exit gate and after meaningful real use; deferred work can be removed if its value is not demonstrated.

| Milestone | GPT A | GPT B | Exit gate |
| --- | --- | --- | --- |
| M0: Clear state and safe collaboration | A01, A02, A03 | B01, B02, B03 | Current-state record, true backup freshness, agreed UI contract, compact understandable status panel, and stable file ownership. |
| M1: Reliable daily transactions | A04, A05, A06 | B04, B05, B06 | Correct payment/draft behavior; existing tests and relevant emulator tests pass; real login/persistence/two-device evidence is recorded or explicitly remains NOT CHECKED. Do not label production acceptance complete while any required device case is missing. |
| M2: Efficient everyday work | A07, A08, A09 | B07, B08, B09 | Measured read/write and rendering changes; safe storage-pressure behavior; daily collection and read-only statements agree with the ledger; conflict decisions preserve originals. |
| M3: Recovery and maintainability | A10, A11, A12 | B10, B11, B12 | Backup/recovery drill, update and code-rollback drill, phone usability evidence, documented scaling decision, and maintained release checklist. |

Pure presentation work and fictional-data tests can proceed while a physical-device test is waiting. Schema or sync protocol changes must not bypass the missing production acceptance gate.

## 5. GPT A backlog: Sol's half

All implementation packages begin as NOT STARTED. A01 is the next ready package. A baseline read and this plan do not count as implementation or execution of all tests.

| ID | Points | Work and deliverable | Dependencies | Acceptance |
| --- | ---: | --- | --- | --- |
| A01 | 2 | Establish the current source/deployment/evidence baseline, open-PR overlap, and compatibility fixtures; reconcile stale documentation. | None | Pin reviewed code and observed live version separately. Mark each test passed, failed, blocked, or NOT CHECKED. Inventory existing features and establish shared progress record. |
| A02 | 3 | Separate business-data revision from sync transport/status updates; correct backup freshness semantics. | A01 | Routine no-change checks leave backup current. Customer/payment/history changes make it stale. Remote business changes also make it stale. No schema compatibility or receipt changes. |
| A03 | 3 | Define the smallest UI/service boundary and integrate presentation modules without a broad rewrite. | A01; coordinate A02 edits | Publish status/command contract and sample states. UI cannot directly mutate persistence or financial data. Existing workflows and offline imports still work. |
| A04 | 4 | Complete live login, retained-access, two-device transaction and failure acceptance; fix demonstrated core failures. | A01; before declaring production-ready | Test reopen, expired-token refresh, A-to-B and B-to-A fictional records/payments, offline/reconnect, and concurrent receipts. Compare stable receipt IDs, amounts, dates and balances. Missing physical access remains explicit. |
| A05 | 3 | Harden queue, interrupted upload, retry, session renewal and conflict transitions where evidence reveals gaps. | A03; use A04 findings | Lost responses and retries never duplicate a receipt; local edits survive interruption; stale writes are rejected/reconciled; conflicting originals remain available. |
| A06 | 3 | Extend independent monetary/date integrity tests for uncovered cases, preserving existing logic. | A01 | Check mixed numerals, safe integer bounds and aggregate totals, Jalali leap/month-end cases, custom dates, overpayments, cancellation/restore and concurrent receipts against independently derived expectations. |
| A07 | 3 | Add privacy-safe resource measurement and compare estimates with authorized Firebase usage observations. | A03 | Report reads, writes, requests and transfer estimates separately, including rule lookup assumptions. Distinguish session/device estimates from project-wide usage. No customer data or secrets in metrics. |
| A08 | 3 | Reduce redundant full checks and unnecessary local serialization, based on A07 evidence. | A05, A07 | Repeated focus/visibility events are coalesced; manual sync and pending writes remain effective; freshness labels remain honest. Same scripted workload consumes fewer reads without missed or duplicated payments. |
| A09 | 4 | Handle local storage pressure and growing customer/ledger payloads safely; benchmark realistic sizes. | A05, A06 | On quota/write failure retain last good ledger, queued intent where durably available, and a recovery path. Test 100/500/1,000 fictional customers with realistic history sizes; measure serialized bytes, not only customer counts. No silent localStorage/IndexedDB migration. |
| A10 | 3 | Prove backward-compatible backup, malformed-file rejection, conflict-history retention and safe recovery. | A02, A05, A06 | Schema-1/schema-2 and current fixtures preserve financial meaning and receipt IDs. Invalid imports leave the active ledger unchanged. Test recovery in isolated fixtures; do not overwrite production to demonstrate it. |
| A11 | 3 | Evaluate changed-record downloads and capacity architecture after measurement; record a go/no-go design decision. | A07, A08, A09 | Compare current full-pull cost with a design using trustworthy server ordering, complete pagination, concurrent writes, reconciliation and full recovery fallback. A documented decision to defer is valid. Protocol implementation/migration requires a separately sized follow-up. |
| A12 | 2 | Maintain technical release integration, cache compatibility, rollback and operating evidence. | Each integrated release; final M3 after A10/A11 | Pin release SHA/cache; pass relevant checks; preserve old-client compatibility or handle upgrades safely; test static-code rollback independently of data. Maintain change log, progress and evidence limits. |

GPT A total: 12 packages, 36 points.

## 6. GPT B backlog: delegated half

All implementation packages begin as NOT STARTED. B01 is ready immediately. B03 can follow its screen inventory while A establishes the contract; B02 waits for accurate state semantics.

| ID | Points | Work and deliverable | Dependencies | Acceptance |
| --- | ---: | --- | --- | --- |
| B01 | 2 | Capture current mobile journeys and record the largest usability problems and existing strengths. | None | Cover find customer, record payment, due list, sync status and backup. Inspect screenshots; use fictional data. Separate observed issues from untested behavior. |
| B02 | 3 | Consolidate local-save, pending/conflict, last online check and backup status into one compact presentation. | A02, A03, B01 | States remain distinct; failed/queued operations cannot appear synced. Historical timestamps do not imply all devices are current. Details expand without replacing the login/payment form. |
| B03 | 3 | Improve compact RTL spacing, contrast, touch targets and keyboard-visible layout using current visual style. | B01 | Keep four-tab navigation, readable labels and visible errors; no horizontal page overflow in target CSS viewports. No palette overhaul or decorative animation. |
| B04 | 4 | Make payment entry easy to verify and resistant to repeated submission through approved commands. | A03; coordinate A06 | Customer/policy, unit, amount, actual date and resulting balance are clear. Saving state prevents accidental repeat submits; validation preserves typed values; existing genuine-duplicate acknowledgement still works. No new multi-step wizard. |
| B05 | 3 | Improve policy/date entry, inline errors and draft recovery presentation. | A03, A06; B03 | Schedule preview uses A's calendar outputs; mixed numerals work; drafts are visibly unconfirmed; invalid forms retain input and focus an actionable error. Existing schedules are not regenerated. |
| B06 | 3 | Bound customer-list rendering and preserve local normalized search/filtering and navigation context. | A03, B01 | Search still checks all loaded customers, even with a short displayed page. Persian/Arabic/Latin digits find the same customer. Preserve filter/scroll context on return; no new Firestore query per keystroke. |
| B07 | 3 | Improve daily collection task entry using existing due and customer views. | A03, A06, B06 | Clearly distinguish overdue, today and upcoming; reach the correct customer's payment form quickly; displayed totals match A's selectors. Keep existing navigation. |
| B08 | 3 | Add a simple read-only, printable customer statement with a dated snapshot and data-status note. | A03, A06; coordinate A10 | Show policy amounts, actual receipts, cancellations, outstanding balance and due dates from the established calculation source. Exclude unfinished drafts; include committed local receipts even when upload is pending, and disclose that status. No new writes or independent arithmetic. |
| B09 | 4 | Make conflict comparison and correction history understandable without automatic resolution. | A03, A05, A06 | Both versions and financial consequences are visible; explicit choice required; unresolved originals stay preserved; canceling review leaves records unchanged. Never choose the latest timestamp automatically. |
| B10 | 3 | Simplify backup, restore preview, storage-error and recovery guidance. | A02, A09, A10 | Accurate backup status; clear counts/currency and consequences before restore; connected-ledger protections preserved; errors retain the recovery route and never instruct deletion of browser data. |
| B11 | 3 | Add concise contextual Persian help and expandable diagnostics for support. | A03; reconcile open PR #15 before overlap | Explain save/sync/backup differences and how to use another device; diagnostics show non-sensitive version/state information only; no recurring login or technical commands for the father. |
| B12 | 2 | Maintain mobile workflow, accessibility and perceived-performance evidence for releases. | Each UI release; final M3 after B10/B11 | Check RTL, keyboard, focus, screen-reader status announcements, text contrast and touch targets. Record Galaxy A20 and Safari evidence separately from emulation, including failures and NOT CHECKED cases. |

GPT B total: 12 packages, 36 points.

## 7. File ownership and interface contract

The current `dist/app.js` mixes views, events, persistence and integration. A role split alone cannot make parallel edits to it safe.

| File or surface | Sole writer | Rule |
| --- | --- | --- |
| `dist/app.js` | GPT A | Integration and persistence bridge. Until A03 establishes a safe boundary, B proposes scoped patches against a pinned base rather than directly rewriting this file. |
| `dist/core.js`, `dist/clock.js`, `dist/sync-model.js`, `dist/sync.js`, `dist/firebase-rest.js` | GPT A | Monetary/date invariants, queue, reconciliation, auth/session transport, and core selectors. |
| `dist/firebase-config.js`, `firestore*.rules`, `firebase.json`, Firebase scripts | GPT A within the authorized task scope | Not routine UI targets. This plan does not require production configuration changes. |
| New `dist/ui/` presentation modules | GPT B after A03 | Render from supplied snapshots and use approved commands. Proposed directory; it does not yet exist at the baseline. |
| Existing presentation CSS | GPT B | Scoped changes; preserve desktop behavior and existing design. Coordinate new asset imports with A. |
| `dist/index.html`, `dist/sw.js`, `dist/offline.js`, manifest and shell inventory | GPT A as integration steward | One matching cache version/inventory per release. B reports required assets instead of independently bumping caches. |
| Financial, sync, persistence, rules and compatibility tests | GPT A | B can request cases and independently review results. |
| New UI-specific tests and screenshot evidence | GPT B | Fictional data; no business-rule duplication in tests or UI. |
| `README*`, `docs/HANDOFF.md`, `VALIDATION.md`, master plan/progress summary | GPT A | B supplies task-specific evidence in `docs/work/b-XX.md`; A consolidates to avoid competing edits. |

Cross-review is read-only unless the writer explicitly transfers a scoped edit. If ownership must change, record task ID, files, base SHA, recipient and lease end before either GPT edits them. Rebase and re-review after any dependency or shared contract changes.

A03 must define these concepts before B depends on them; names here describe requirements, not an API already implemented:

- Read-only snapshot: business revision, currency, customer/policy summaries and due items, local-save outcome, pending/conflict counts, last successful cloud-check timestamp, local/remote freshness information, backup business revision, storage state and actionable error.
- Status vocabulary: local saved, pending, checking, checked at a historical time, offline, login renewal needed, conflict review needed, storage failed. Offline shell readiness and clock verification remain separate indicators.
- Commands: validated customer/policy/payment edits, cancellation/restore, explicit conflict choice, manual sync, preview/confirm backup restore and export. Use existing functions behind the bridge, rather than duplicating arithmetic in UI code.
- Request lifecycle: one save command per confirmed intent, clear busy/failure results, stable operation identity for retries, and input retained on failure.
- UI modules receive only what they need. They do not import Firebase credentials/session helpers or write directly to `localStorage`.
- Draft lifecycle and financial commands are separate. Diagnostic details must not expose customer data, passwords, tokens or account contents.

## 8. Performance and resource plan

Measure first, then optimize. Keep the usage information in an expandable owner/support view rather than making the father's daily UI a technical dashboard.

At the current implementation, a no-change full check reads approximately `N + 1` documents for `N >= 1` customers. A separate successful targeted save affecting one customer is approximately four reads including the rule-dependent lookup, and one write. This is a planning model, not an observed daily meter; retries, first connection, conflicts, batching and overlapping full checks change the result.

Example workload across all devices: 20 full checks and 50 separate one-customer uploads in a day.

| Customers | Estimated reads | Estimated writes |
| ---: | ---: | ---: |
| 100 | 2,220 | 50 |
| 500 | 10,220 | 50 |
| 1,000 | 20,220 | 50 |

Use A07 to compare this model with actual authorized console usage and current Firebase documentation. Separate Auth/hosting requests from Firestore document operations and include bytes transferred. A page-session counter is neither a daily project total nor a global safety limit.

A08 should first coalesce redundant events and avoid unchanged local rewrites. Do not remove server readback, preconditions or reconciliation to make numbers smaller. A11's incremental protocol is conditional; defer it if simpler changes provide sufficient headroom.

For phone performance, record cold/warm open, local search, list rendering, payment-save feedback, sync duration, document sizes, and local serialization. Use identical synthetic fixtures before/after. Initial targets are no page overflow, no lost input/focus during updates, and local search feedback within approximately 200 ms at the agreed 1,000-customer fixture on the target handset. Establish actual device baselines before treating that provisional target as a release promise. No claim of measured improvement without the paired measurements.

The Galaxy A20 has a 720 × 1560 physical panel, but this is not its CSS viewport. Start responsive checks at 360 × 780, 360 × 660 and a 360 × 480 keyboard-constrained layout; measure actual browser dimensions on the handset when available. Check Safari separately.

## 9. Definition of done and evidence

A task progresses through READY, IN PROGRESS, IMPLEMENTED, REVIEWED, INTEGRATED and, when applicable, DEVICE VERIFIED. Use BLOCKED for missing dependencies. An implemented feature can still have NOT CHECKED device cases; never collapse these states into one green check.

Each task evidence record must contain:

1. Task ID, implementation owner, current status, pinned base and head SHAs, branch/PR and changed files.
2. User-visible outcome and invariant affected; exact input/expected/observed output for any defect fixed.
3. Commands and checks actually run, their results, and links or local evidence references.
4. Independent review disposition, remaining failures, and every blocked or NOT CHECKED item.
5. Compatibility, cache, backup and data implications, with recovery/rollback instructions proportional to the change.

Run existing Node checks and syntax checks for changed JavaScript; run the Firebase emulator groups when changing sync, storage authorization, transport or relevant contracts. Add tests for meaningful uncovered risks, not trivial styling or tests that simply repeat implementation. Verify UI changes from real rendered screens with fictional data. No browser/screenshot claim based only on code inspection.

Financial acceptance compares customer and policy totals, receipts with stable IDs and canceled status, and due dates across views, devices and backups. Preserve individual receipt evidence: matching balances alone can conceal duplicated or missing payments.

Release gate: technical review by A, usability review by B, and a single integration steward. No direct changes on `main`; focused branches and reviewed PRs. A plans and coordinates any merge/release within the owner's existing authorization. If further approval is actually required, finish the reviewable candidate first. Code rollback does not restore or reverse database records; restore/recovery has its own tested path. Keep old client/cache compatibility in view for phones that remain open.

## 10. Initial work queue and progress protocol

| Order | GPT A | GPT B | Parallelism |
| --- | --- | --- | --- |
| First | A01 baseline and compatibility inventory | B01 screen/task inventory with fictional data | Independent read-only evidence work. |
| Next | A02 business revision and backup semantics; A03 minimal UI contract | B03 scoped layout/readability proposal and owned CSS changes | B leaves `app.js`, cache and data logic to A. |
| Then | A integrates the agreed status bridge and validates invariants | B02 compact status presentation, then B04 payment clarity | B02 waits for accurate A02/A03 states. |
| Next milestone | A04/A05/A06 in dependency order | B05/B06 after their contracts are available | Physical-device evidence can remain a named blocker; no invented acceptance. |

Only one active implementation package per GPT initially. Break a large package into small PRs while keeping its owner and acceptance criteria. After each integrated PR, refresh the other GPT's base before dependent work.

A owns the shared summary; each GPT writes its evidence file in its own task namespace. This document starts the registry: all 24 implementation packages are NOT STARTED; A01 and B01 are READY to claim. Do not mark them IN PROGRESS merely because this plan exists. Before first implementation, establish a shared repository progress file with task status, owner, branch/head, dependencies and evidence link.

Independent GPT chats do not share memory automatically. Use repository files and PRs as the shared record. A handoff must include the exact current plan revision and code base; the owner should not have to manually reconcile conflicting claims. When source evidence contradicts a historical note, preserve history but clearly correct the current summary.

## 11. Ready-to-paste handoff for GPT B

Copy the following block into the separate GPT chat and include the URL of this plan's committed file:

```text
You are GPT B, the Persian mobile UI and daily-workflow owner for Daftar Insurance Ledger.

Project: https://github.com/nikahanghojjati-oss/-daftar-insurance-ledger
Site: https://nikahanghojjati-oss.github.io/-daftar-insurance-ledger/
Planning baseline: fad239e36510c5aa8cab9261a1d0e280572e1c22.

Read AGENTS.md, README.md, docs/HANDOFF.md, VALIDATION.md, and the shared two-GPT work plan supplied with this message. Refresh current main and open PR state before editing; PR #15 version diagnostics was still open at planning time. Do not assume historical documentation is current.

Own B01 through B12, totaling 36 estimated effort points. Sol, GPT A in the owner's other chat, owns A01 through A12 and technical integration. Keep the split and dependencies in the master plan.

Start with B01 only: inspect current mobile journeys with fictional data, capture/inspect available screens, and return a prioritized screen inventory and a scoped proposal for B02/B03. Record missing physical-device or login access as NOT CHECKED. Do not request passwords or real customer exports.

After B01, B03 can proceed in owned presentation CSS. B02 must wait for A02's correct backup freshness and A03's UI/service contract. The first visible improvement should be a compact status/backup panel that removes repeated messages while separately representing saved-on-device, pending uploads, last online check, conflicts and backup freshness.

Preserve four-tab navigation, existing Persian RTL style, mixed numeral entry, offline use, drafts, existing schedules, receipt IDs and cancellation history. The father's Galaxy A20 is the main mobile target; measure CSS viewport dimensions rather than treating physical panel pixels as CSS pixels.

Do not edit monetary/date calculations, sync transport/reconciliation, persistent storage, schema, auth, Firebase configuration or rules. Do not calculate financial results independently in UI code. Use A's snapshots and validated commands; request interface changes from A when needed.

Sol is the sole writer of dist/app.js, dist/index.html, dist/sw.js and dist/offline.js until a written ownership change. You own agreed CSS and new dist/ui/ presentation modules after the contract exists. Do not start a broad refactor or independently bump cache versions. Submit a scoped proposed patch when a protected file must change.

Use focused branches/PRs, fictional fixtures and task-specific evidence files docs/work/b-XX.md. Return task ID, pinned base/head, changed files, validation, screenshots where relevant and every NOT CHECKED item. Cross-review is independent review, not permission to change the other lane. Do not merge/deploy or alter production records/configuration as part of your delegated UI work.

Your first response should confirm B01 scope, identify file/PR overlap, and begin the read-only screen inventory. Keep later work within your allocated packages and their dependencies.
```

## 12. Review cadence and later decisions

After each release, review evidence, outstanding defects and resource measurements before opening another feature. At each milestone, confirm the father's actual recurring difficulties and keep the smallest useful solution. Re-estimate the remaining 50/50 split using observed effort.

After several weeks of stable daily use, reconsider whether a changed-record sync protocol, storage migration, richer reports or additional exports solve a measured problem. They are decisions, not assumed obligations to expand the product. Continue A12/B12 for later release cycles, and record any added package with owner, estimate, dependencies and acceptance before work begins.
