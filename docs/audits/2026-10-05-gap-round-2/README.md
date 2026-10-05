# Gap round 2: what we hold, read in full; drying as stated; page statements by table; new documents; checked

> **Historical record** (2026-10-05): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../../docs/OPEN-PROBLEMS.md).

GOALS steps 2 and 5; C3, C4, C9, C11, C12. Decisions D127 (drying as a sheet states it, guide drying), D128 (a page
statement can head one table) and D129 (what the round's blind draw named). The reader round (D125, D126) closed 853 of
3,351 gaps and named the causes that still kept values out or wrong; the owner asked for a round that works them by
priority, with Claude Opus deciding and Claude Sonnet reading and coding, and chose its scope on 2026-10-05 (GOALS,
"Decided on 2026-10-05, gap round 2"). This round began from a0f5a87.

## What was built

| Part | Where | What it does |
|---|---|---|
| Drying need and open hours | `parseDrying` (`build/src/normalize/process.js`), `Drying need`, `Drying hours open` | required, optional, not needed; "6+ h"; a time from 0 h and "Only dry if" read optional (D127, D129) |
| Guide drying | `GUIDE_AXES` (`build/src/products.js`) | the printer maker's guide answers a silent product's drying, labelled; never a Variant's (D129) |
| Page statements by table | `Table` on `page_context`, `build/src/page-context.js` | a statement that heads one table reaches only that table's values (D128) |
| Hardened nozzle from the nozzle lines | `readAbrasion` (`build/src/recipe.js`) | one reader for the build, the migrations and the import |
| Denied annealing | `readPostProcessingState` (`build/src/normalize/specimen.js`) | "has not been annealed" is as printed |
| Product names | `matchProduct` (`scripts/ingest/read-proposals.mjs`), `apply.mjs`, GRADE-PRODUCT-DUPLICATE | a name written together is one name; a "+" is part of a name |
| A skipped context audit | `scripts/audit/context-witness.mjs` | prints SKIPPED and a GitHub Actions warning where the text cache is absent |
| Progress | `targets.mjs --after --frozen TARGETS.csv --out after` | the frozen list of this round, closed and opened |

## What changed in the tables

| Migration | What |
|---|---|
| m355 | every profile and guide row typed for drying need and open hours |
| m356 | 17 page statements that reached two tables read on their pages; 3 now head one |
| m358 | the test-bar blocks of 96 sheets m192/m300 did not reach: 252 page statements, 480 values' print parameters; eSUN's nozzle-size row held whole |
| m359 | 714 detector candidates (`detect.py`) and 631 drawing asks read on their pages: 146 measurements corrected, 14 values added |
| m360 | names written together ("HIPS-X", "GreenyPro"): 3 values |
| m362 | batch b43, ten of the thirteen held sheets: 12 products, 296 values, 9 profiles |
| m363, m364 | batch b44, twenty makers' pages, one profile each; the PA12 CF+ page filed under its product |
| m365 | the blind draw's families (D129): 169 dry-box answers out of Drying, 105 cells the readers found, 21 page statements as printed, 101 one-sentence test-bar statements on 82 sheets (548 values' print parameters, 165 values' conditioning sentences) |

m357 and m361 were planned (second reads applied, copies merged) and not used: the second reads offered only
mis-pairings, and the copies were not worked (OPEN-PROBLEMS §31).

## Files

| File | What |
|---|---|
| `TARGETS.csv`, `baseline/` | the frozen targets (the reader round's open list) and the build before the round |
| `after/` | `PROGRESS.md`: closed and opened against the frozen list; `DECISION-DIFF.md`: the decision diff of the round |
| `fill-text.mjs` | phase 0: cached text for every registered original that is held, so it can be read again |
| `guide-drying-backcheck.{mjs,md}` | the guide's drying against products that state their own (D127) |
| `page-tables.mjs`, `page-tables/` | the statements that reach two tables, and their verdicts (D128) |
| `specimen-blocks/` | the test-bar blocks read for m358 |
| `detect.py`, `candidates.csv`, `verify/` | the error-family detectors, the verifiers' verdicts and Opus's decisions (m359) |
| `drawings/` | conditions a drawing, legend or other page states (m359) |
| `digits/` | numbers a text layer prints that the optical reading does not (`compare.py`, `suspects.csv`) |
| `reconcile/`, `readings/`, `proposals/` | the reader round's readings reconciled again, the second reads run, and what they proposed |
| `held-sheets.csv`, `site-targets.csv`, `site-leads.csv`, `ingest/` | b43 and b44: what was read, fetched, admitted and not |
| `MAKER-QUESTIONS.{csv,md}` | 125 questions to 36 makers, prepared for the owner; nothing sent |
| `blind-draw/` | the draws (`draw.py`, samples, verdicts) and `PROBE.md`, the probe of moved answers |
| `blind-draw/sweep/` | the sweep of each family the draws named (m365, D129): detectors, candidates, verdicts and decisions |
| `DOCS-CHECK-PROMPT.md`, `docs-check.csv` | the documentation check of phase 8: the prompt, and the findings (file, line, what the document says, the truth, the fix) |

## Measured

- **Targets.** 2,518 frozen; `after/PROGRESS.md` counts them closed and opened. Drying gaps closed most (guide drying
  and drying as stated), then nozzle and bed (b44). No product's mechanical or thermal headline gap closed: the round's
  new values went to new products or corrected held ones.
- **Error rate.** The first blind draw (seed 20261007) found 6 of 40 records wrong, 4 of them deciding, and the probe
  of 22 moved answers 7 of 30 moved cells; every family was swept (m365, D129). The second draw (seed 20261008) found
  none of 40 wrong; eight of its records hold less than their page prints, each answered by another profile of the
  product (`blind-draw/verdicts-20261008.csv`, OPEN-PROBLEMS §31).
