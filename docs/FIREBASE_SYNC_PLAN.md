# Firebase sync implementation gate — دفتر

## Current decision — November 7, 2026

The historical setup and proposed private-link text below are superseded. The app uses persistent Email/Password REST authentication without credential-bearing links, plus local-first synchronization to the existing Firebase ledger. Two exact approved accounts will share that same ledger after the access update and manual rule publication. Account identity must never select a different customer collection. See the latest HANDOFF.md and VALIDATION.md for tested and published status. Real-device production acceptance remains separate from browser/emulator evidence.

## Current release status
The personal ledger is still browser-local. The existing Firebase project ID is `daftar-insurance-ledger`, but its Spark plan, Firestore database, Authentication settings and web-app configuration have not been verified. Do not turn on a sync badge, upload real records, or claim cross-device consistency until the two-device acceptance test passes. Keep JSON export/restore available regardless.

## Exact setup needed from the project owner
1. Open the existing project in Firebase Console; verify **Spark** with no billing account linked.
2. Create its **first/default Firestore Standard database** in production mode (deny by default), not a paid secondary database. Select the location deliberately because it cannot be changed later.
3. Enable Firebase Authentication **Email/Password** and create one dedicated user for this ledger. The father does not need a Google account; he should never see a login form. Keep the UID available for the rules. Share initial access on the father's device with a one-time owner-controlled link/QR, with credentials in the URL fragment (never the GitHub URL path/query, commit, analytics or logs); retain a recovery copy privately. After that, Auth persistence handles return visits. Clearing browser data requires reopening the access link.
4. Register a Web app and supply its public config (`apiKey`, `authDomain`, `projectId`, `appId`) to the implementation, plus the dedicated Auth UID. **Never commit the account password, refresh tokens, service-account JSON or real customer exports.**
5. Publish and test restrictive Firestore rules tied to that exact UID, then run the emulator and real two-device acceptance test with **fictional** records before migrating anything real.

An anonymous Firebase account on each device cannot establish a shared ledger by itself. A public `allow read, write: if true` rule is unacceptable, even with a secret link.

## Sync protocol to build and verify
- `localStorage` remains the immediate offline confirmed ledger. Save each business mutation and its pending sync operation atomically in one stored record. Customer, policy, payment and schedule IDs stay stable; restore/cancel audit is retained.
- Remote shape: one customer document per customer under a single dedicated ledger, not one giant whole-ledger document. Put currency and schema in a ledger metadata document. Do not write on input keystrokes or poll by the minute.
- On opening and reconnecting, read the metadata and customer collection once; while the page is open, use a single listener for remote changes if needed. On local changes, queue only the changed customer, then read its current version and write with an update-time precondition. A stale precondition triggers reread and merge, never blind overwrite.
- Three-way merge the last acknowledged baseline, local pending customer and remote customer by stable customer/policy/payment/receipt IDs. Independent additions and receipts can merge. Concurrent edits of the same name, installment or payment state require an explicit conflict screen; retain both originals and the pending operation until resolved. Never discard an offline payment silently.
- Only show “saved online” after server acknowledgement and a server read of the accepted revision. Show “saved on this device; waiting to sync” while offline or pending and a visible retry/error state on failure. Do not mark a Firestore local-cache write as server-confirmed.
- First-device migration is an explicit backup-first upload only if cloud is empty. Joining a second device downloads the existing cloud ledger without replacing a nonempty local ledger; require a review/merge flow. No automatic destructive restore.
- Test interrupted writes, duplicate retries, concurrent same-customer edits, separate-customer edits, offline receipts on two devices, cancellations, reconnect, app closure and backup/restore. Keep rules and emulator tests in the repository.

## Quota budget (illustrative, not a guarantee)
Firestore Standard's free quota applies to one database **per project**: 50,000 document reads and 20,000 writes per day. A customer-list bootstrap of 200 customer documents costs roughly 200 reads; ten opens cost roughly 2,000 reads. One customer edit should cost about one current-document read plus one write, with extra reads only on conflicts/retries. One live listener should be used instead of minute polling. Set a client-side session ceiling and inspect the Firebase Usage dashboard during the two-device test. Google bills no extra usage on Spark, but hitting its quota can stop operations for the day. Avoid paid backup/PITR/TTL features; JSON downloads remain the independent backup.

Official references: https://firebase.google.com/docs/firestore/quotas ; https://firebase.google.com/docs/firestore/manage-data/enable-offline ; https://firebase.google.com/docs/firestore/security/get-started ; https://firebase.google.com/docs/auth/web/anonymous-auth

