# Coherence build: tracks, files and rules

> **Historical record** (2026-10-18): how the owner's chosen changes from [RECOMMENDATIONS.md](RECOMMENDATIONS.md) are
> built. Read that file for each change's before → after, place, risk and dependencies.

## The owner's choice (2026-10-18)

All of S1 (C01–C13); the *do* changes of S2 (C14–C22), S3 (C23–C29, C31; the footer as option B), S4 (C32–C39) and S5
(C40–C44); of S6 the PM's *yes* leans, C50 (Inter in the selector) and C51 (one meaning per colour). The *later* items
(C30, C45–C49) and the leans against (C52–C54) are documented, not built.

## Tracks (each in its own worktree and branch, built in parallel, merged by the executor)

| Track | Who | Worktree, branch | Changes | Files it owns |
|---|---|---|---|---|
| A, words and facts | Claude Opus | `/Users/farid/Documents/h2c-cb-a`, `cb-a` | C01, C02 (except the footer's citation), C04–C22 | shared word and helper modules (`material-words.js`, `format.js`, `labels.js` describeConstraint, `print-brief.js`, `display-numbers.js`, `material-highlights.js`, `material-facts.js`), `detail.js` text and the tabs Overview, Mechanical, Thermal, Printing, Environment, Price, Sources (not its head, not the Products tab), `explain.js` renderWhy, `app/pages` sections' words (`findings.js`, `masthead.js`, `sources.js`, `among.js`, `method-page.js`, `charts/temperatures.js`, `products/card.js` dates), `build/src/print-guide.js`, their tests |
| B, frame and identity | Claude Opus | `/Users/farid/Documents/h2c-cb-b`, `cb-b` | C03, C23–C29, C31 (with its citation's date form), C32, C33, then C50 | `app/css/tokens.css`, the frame and drawer-head rules of `app/css/app.css`, `app/index.html`, `main.js` (status bar, theme, kept scroll), `app/pages/shell.js`, `assets/frame.src.css`, `assets/page.js`, `sections/footer.js`, `index-page.js`, `method-page.js` footer only, `detail.js` head only (C27, C29), the fonts for C50 |
| C, charts | Claude Sonnet | `/Users/farid/Documents/h2c-cb-c`, `cb-c` | C40–C44, C51 | `parallel.js`, the family colour call in `ashby.js` / `chart.js` / `decision.js`, the Parallel lines rules of `app.css` |
| D, hand-offs | Claude Sonnet | `/Users/farid/Documents/h2c-cb-d`, `cb-d` | C34–C39 | `detail.js` Products tab (the `Grades` branch of `tabBody`, `makerBlock` use there, the closed product line), `brief.js`, `table.js` star column and its `app.css` rule, a shared sort key moved from `app/pages/products` into `app/js/ui` |

The groundwork is on the base branch already: `app/js/ui/dates.js` (`dayWords`, `daysWords`, `documentsRead`,
`provenanceWords`). Use it; do not recreate it.

## Rules

1. **Stay in your files.** Where your change needs a word or helper another track owns, use what is there, and say so in
   your report; the executor reconciles at merge.
2. **No answer moves.** `npm run build:diff -- --ref coherence-review` shows 0 differences (label paths only for C05).
3. **Few commits**: one per coherent group (one to three per track), in the repository's style, ending with
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. **Do not commit `build/snapshot/ui/`** (run
   `npm run ui:check -- --write` to see layout failures, then `git checkout build/snapshot/ui`); the executor re-records
   them once. Do not edit `docs/` other than this round's folder; the executor writes the documents.
4. **Checks before you report**: `npm run build`; `npm test` green (rewrite a test your change breaks, keeping what it
   proves); `npm run pages && npm run pages:check` 16/16; `node scripts/ui-fuzz.mjs --n 300` exit 0 if you touched
   the main page or its words; `npm run ui:check -- --write` no layout failure, then restore the snapshots;
   `node docs/audits/2026-10-18-selector-refinement/drawer-ids.mjs` TOTAL unchanged if you touched the drawer.
5. **Report in under 200 words**: commits, what each C item became, anything not done and why, any file outside your
   list you had to touch.

## Outcome

Merged on `coherence-review` after a9379226 (the groundwork, `app/js/ui/dates.js`, is fbe4951a before it); what each
change became is [D147](../../DECISIONS.md#d147-the-selector-and-the-material-pages-read-as-one-tool-one-computation-per-fact-one-word-per-thing-one-frame).

| Track | Commits |
|---|---|
| A, words and facts | 755dfd6a the shared words, one function per fact for the drawer and the page, and the pages' side (C01–C19); 452ca4c9 the drawer, each fact stated as the page states it (C02–C22) |
| B, frame and identity | b335c279 three radii, one theme button, the page bar, the drawer's head, one provenance line (C03, C23–C29); 5c33eb62 the footer band, the closing line, the way back on Products (C31–C33); 899dfa8a Inter in the selector (C50) |
| C, charts | 546c53a0 Parallel lines carry the selector's answer and its question, and the family palette keeps blue for "this material" (C40–C44, C51) |
| D, hand-offs | 3836a75e the drawer's Products tab: search first, one order said, the page's figures, a link to each card (C34–C37); e67d328c the decision brief names the pages, the shortlist star after the name (C38, C39) |

**Checks at the merge.** `npm test` 709 of 709; `pages:check` 16 of 16; `ui-fuzz` over 300 scenarios, exit 0; `ui:check`
no layout failure; `drawer-ids.mjs` TOTAL 28950/30992, unchanged; `build:diff` against 0125d29e words only (the guide's
labels and names, gate reasons, the method row m437 adds, archived in `archive/migrations/`); every `build/snapshot/*.csv`
byte-identical but `pages.csv` (page sizes). No screening answer moved. Release 3cc2e5f2a439 → 9ca94d31fc5d.

**Not built.** C30 and C45–C49 (later) and C52–C54 (advised against), in OPEN-PROBLEMS §37.21. Closed by the build in
OPEN-PROBLEMS: §37.19's dropped bound sign (C14), §37.20's Products order and find (C34, C35) and the unattributed
"Typical applications" (C10).

**At integration.** One import of the date words in `main.js` (two tracks had each added it); the brief's dated line
keeps both tracks' changes. In Data coverage, a name in the rarely published table now opens the tab holding its value
(Mechanical or Thermal), since C21 took those properties out of Known gaps. `npm run verify` passed (361 s; verify:fast's
steps 42 s).
