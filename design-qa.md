# Three appearances visual QA

final result: passed

## Source and intended adaptation

Owner selected all three concepts, to be selectable in the existing application. Source visual truth: `libfile_176aeaefac9c8191a365ee8b68aa90a6`, “Three mobile screens side by side.png”. Inspected at `/workspace/scratch/f02a83413fb6/design-refs/Three mobile screens side by side.png` (1672×941 px). Individual content crops: (14,103)-(550,921), (565,103)-(1105,921), (1124,103)-(1658,921). At 360px width these normalize to 360×549, 360×545 and 360×551. These are concept-board regions, not screenshots from an A20; do not stretch them to 360×780 or claim pixel-identical reproduction.

Target is a responsive production adaptation with existing live calculations, ledger separation, backup/sync states, 48px primary controls and a conservative Galaxy A20 CSS viewport. Preserve the hierarchy and palette of each concept while allowing vertical scrolling and actual ledger content. No device frame, decorative heavy media, gradient or new runtime library is needed.

## Browser evidence

Application candidate: `3151bf8c8d8fc0ab02001054814056ddc0982bad`, PR #21. Chromium run: https://github.com/nikahanghojjati-oss/-daftar-insurance-ledger/actions/runs/42402397966 . Artifact `fictional-browser-evidence` has seven-day retention; reproduction is `node scripts/browser-appearances.cjs` in the same CI environment. Local evidence base `/workspace/scratch/f02a83413fb6/appearance-evidence-release/`.

CSS viewport 360×780, deviceScaleFactor 1. Full-page screenshots are `appearance-1-daybook.png` (360×934), `appearance-2-agenda.png` (360×1010), `appearance-3-desk.png` (360×971) and `appearance-settings.png` (360×977). Full-page heights include scrollable content and bottom safe clearance. Fixed navigation sits at the viewport bottom, so it appears within the full-page captures; it is not another embedded navigation bar.

Full-view paired inputs actually opened and compared: `comparison-daybook.png`, `comparison-agenda.png`, `comparison-desk.png`, each combining normalized source and browser screenshot in one image. Focused typography/amount/control comparison: `comparison-daybook-detail.png`, opened separately. All files are under the evidence base above.

State: fictional personal ledger, two open today installments totaling 800,000 toman, tomorrow 1,200,000; no overdue balance, total owed 2,000,000. Reference has different fictional balances and a demo tag. Amounts and status wording intentionally follow the actual fixture, not the image's invented account totals. The first source/implementation capture shows offline setup in progress, later captures show readiness; neither status is fabricated.

## Comparison history

1. First capture of 4d05238: P2 excessive vertical density difference. The repeated Home brand plus top save strip delayed the main task. Header brand had inherited faded styling, and the Daybook action did not span the panel. Fixed explicit brand foreground, removed repeated Daybook heading visually while retaining its accessible H1, moved local-save/backup status after the Home tasks, and made the action fill the panel. Post-fix evidence in run 42401976730.
2. Comparing that capture against the normalized source still found P2 avoidable height: duplicated date headings, amount/currency stacks and unnecessary customer rows in Desk. Added compact header, constrained spacing/line heights, Agenda date badges, inline amount units where they fit, a compact Daybook customer section and search-driven customer results for Desk. Retained native font sizes and usable controls. Post-fix capture of 7635220 in run 42402297787 reduced Home document heights from 1204/1284/1395 to 934/1010/971px.
3. Settings originally placed the third choice below the initial viewport. Moved local-save information after the settings panel and shortened repeated explanatory copy. Final 3151bf8 capture shows numbered choices 1, 2 and 3, native checked/focus state and Home action above the mobile navigation at 360×780. Final paired comparisons and focused details were reopened. No actionable P0/P1/P2 remains against the authorized responsive adaptation.

## Required fidelity surfaces

- Typography: bundled local Vazirmatn is retained for Persian headings, labels and numbers, with system fallbacks. Source font identity cannot be recovered from generated pixels; this is an intentional consistent production font. Persian digits and separators remain readable; monetary units and dates are not clipped. Distinct hierarchy is retained: Daybook's large today amount, Agenda's large date, Desk's task names.
- Spacing/layout: distinct dominant today panel plus tomorrow row, date-led agenda rows plus side-by-side owed/paid summary, and split-day Desk plus actual today task list. 360px phone layouts retain four fixed navigation actions. Controls remain reachable by scrolling at 360×660 and 360×480. Source's much shorter concept height is not reproduced by shrinking touch targets or type. All three choices are visible in the final 360×780 settings capture.
- Colors/tokens: parchment/navy Daybook, warm stone/slate/brick Agenda and mist/cobalt/dark masthead Desk follow the references. Shared forms and panels use the selected theme tokens, while textual labels preserve meaning beyond status color. Focus remains visible. This is not a complete WCAG certification.
- Image quality/assets: no external raster asset was introduced. Existing standard book, calendar, search, profile and navigation icons are reused; the decorative insurance document symbol in concept 1 is omitted as an intentional light production adaptation. There are no placeholders, simulated controls or rasterized app screens.
- Copy/content: actual pending balances, dates, customer names and due counts come from the shared ledger helpers. Today/tomorrow buttons open the matching exact-day filter; Desk's “پرونده” opens the real profile. Three Persian numbered Settings names identify the actual layouts. Calendar generation, receipts and audit data do not depend on presentation.

## Interactions and limits

Browser checks passed: all three choices, per-device persistence through reload, keyboard radio selection, exact unchanged ledger bytes after view changes, draft recovery, a real UI fictional payment with retained receipt ID, offline reload and no horizontal overflow at 360×780, 360×660, 360×480, 768×900 and 1280×900. No page JavaScript errors. Separate intercepted-REST two-account acceptance and installment timing acceptance also pass in this run.

Five offline cached Home renders at 4x CPU throttling: 154/151/155/157/156 ms, measured on CI Chromium. This does not measure a physical Galaxy A20, cold internet installation, real cloud reconciliation or production father sign-in. These remain separate acceptance limits.

## Implementation checklist

Completed: all three structures, shared screen palette, numbered native selection, local-only preference, accurate due/profile routes, cache inventory/version alignment, source comparison loop and required automated checks. No blocking visual findings remain. P3 follow-up: retain the established installed-app icon/splash branding until a separate branding decision is made.
