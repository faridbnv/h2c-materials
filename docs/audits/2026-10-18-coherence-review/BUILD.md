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
