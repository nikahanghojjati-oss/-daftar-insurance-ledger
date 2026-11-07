# Daftar: single-owner working plan

Updated November 7, 2026. Sol is responsible for the entire application. The owner canceled the previous split and all GPT B assignments. No further delegation or helper agents.

## Current evidence

- Starting source: `fad239e36510c5aa8cab9261a1d0e280572e1c22` (Safari fetch fix).
- Owner screenshot shows a recorded online check at 09:05. It does not establish continuous freshness, physical two-device payment synchronization or persistent access after reopening.
- Original automated baseline: 70 passing Node tests. The initial reliability changes add three independent backup-revision cases, producing 73 passing local tests.
- Local Chromium launch failed because the execution sandbox refused the browser's Unix socket. The shared browser could not reach the local preview server. Browser acceptance is therefore executed in GitHub Actions, with its exact result recorded in VALIDATION.md after completion.
- No real account password, production customer record or Firebase rule is needed for this release's tests. Production acceptance remains separate from synthetic/emulator evidence.

## Ordered backlog

| Order | Work | Status / completion condition |
| --- | --- | --- |
| 1 | Correct backup freshness and reduce duplicated sync UI | Implemented and validated by Node, emulator and browser CI; integration/deployment are tracked in PR #17. Routine sync preserves the backup marker; records, incoming receipts, cancellations and retained conflict history invalidate it. |
| 2 | Exercise the real UI in two isolated browser sessions | PASS in browser CI run 42394130049: token renewal, retained session, online payment exchange, offline save/reload, reconnect, exact receipt convergence, backup freshness and responsive layout. This uses intercepted REST, not production Firebase. |
| 3 | Establish physical production acceptance | NOT CHECKED: real-account reopen, expired-token renewal, A-to-B/B-to-A records/payments, offline recovery and concurrent changes. Continue work that does not require unavailable device access; never mark these passed from CI. |
| 4 | Improve payment entry and keyboard/error handling | Next: make customer, currency, amount, actual date and resulting balance clear; retain drafts/errors; prevent accidental repeat submit through existing stable commands. |
| 5 | Bound customer rendering and preserve search context | Next: render manageable batches while local search still covers all records; preserve filter/scroll context. Measure at 100/500/1,000 realistic fictional customers. |
| 6 | Measure reads/writes/bytes and remove redundant checks | Next: distinguish per-session estimates from project totals, then reduce redundant full pulls. Preserve readback acknowledgement, version preconditions and reconciliation. |
| 7 | Harden storage pressure, recovery and backup compatibility | Next: failed writes retain last good state and an actionable recovery route; validate old backups and conflict history in isolated tests. No silent storage migration. |
| 8 | Improve collections, statements and conflict review | Later: clearer due-payment task entry and read-only printable statements using existing calculations. Include committed offline receipts with pending status; exclude unfinished drafts. Preserve both conflict originals. |
| 9 | Decide whether changed-record sync is justified | Conditional: measured usage must justify protocol complexity. Specify server ordering, pagination, concurrent changes and full recovery before implementation. |
| 10 | Maintain offline updates, compatibility and release evidence | Every release: matching cache versions, no shared-origin cache deletion, syntax/Node checks, relevant emulator/browser checks, honest device limits, and code rollback distinct from data recovery. |

## Product constraints

Keep four navigation actions, simple Persian RTL text, explicit toman/rial, mixed numeral input, local fonts, stable receipt IDs, cancellation history, drafts and the established Jalali schedule. First installment is issuance plus one Jalali month and 15 days; subsequent installments are anchored monthly. Existing explicit recurring/weekly schedules remain unchanged.

Stay on GitHub Pages and Firebase Spark with billing unlinked. Do not add SMS, roles, payment processing, AI, paid services or a framework migration without a demonstrated need and owner scope. Test and publish only fictional evidence; never include customer exports or credentials in the repository.

Work on a focused branch, validate the concrete candidate, then integrate within the owner's authorization. Track implementation, automated evidence, deployment and physical acceptance separately. A green test suite is not proof that every device has current data.
