# Daftar: handoff for the next GPT

## Start here
Read AGENTS.md, README.md and VALIDATION.md. This repository is the standalone source for the Persian insurance ledger built for the owner's father. Work only in this project, not the owner's football game repository.

## Source provenance
Recovered from the owner's existing Sites source, commit `05f411c6d4db805d7c1654a13cdb93215f9c2984` (published Sites version 6).
Existing public prototype: https://daftar-insurance-nik-2026.nika-harvard.chatgpt.site
Dedicated repository: https://github.com/nikahanghojjati-oss/-daftar-insurance-ledger
The exact repository name begins with a hyphen: `-daftar-insurance-ledger`. Pages publication is pending verification; do not invent a live github.io URL.

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
